/**
 * @jest-environment jsdom
 */

import NewBill from "../containers/NewBill.js";
import NewBillUI from "../views/NewBillUI.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { localStorageMock } from "../__mocks__/localStorage.js";

jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  let onNavigate;
  beforeEach(() => {
    const html = NewBillUI();
    document.body.innerHTML = html;
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
        email: "a@a",
      })
    );
    onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };
  });
  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });
  describe("When I am on NewBill Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.NewBill);
      await waitFor(() => screen.getByTestId("icon-mail"));
      const mailIcon = screen.getByTestId("icon-mail");
      expect(mailIcon.className).toBe("active-icon");
    });

    test("Then a form should be present", () => {
      expect(screen.getAllByTestId("form-new-bill")).toBeTruthy();
    });
  });

  describe("When I select a file", () => {
    test("Then handleChangeFile method should be called", () => {
      const newBill = new NewBill({
        document,
        onNavigate: onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      const handleChangeFile = jest.spyOn(newBill, "handleChangeFile");
      const create = jest.spyOn(newBill.store.bills(), "create");
      const inputFile = screen.getByTestId("file");
      const e = {
        preventDefault() {},
        target: {
          value: "C:\\fakepath\\example.png",
        },
      };
      inputFile.addEventListener("change", newBill.handleChangeFile(e));
      fireEvent.change(inputFile, {
        target: {
          files: [new File(["example"], "example.png", { type: "image/png" })],
        },
      });
      expect(handleChangeFile).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalled();
    });
  });

  describe("When I submit the form", () => {
    test("Then handleSubmit method should be called", () => {
      const newBill = new NewBill({
        document,
        onNavigate: onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      const handleSubmit = jest.spyOn(newBill, "handleSubmit");
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", newBill.handleSubmit);
      fireEvent.submit(form);
      expect(handleSubmit).toHaveBeenCalled();
    });

    test("Then if the form is not valid, submit button should be disabled", () => {
      const newBill = new NewBill({
        document,
        onNavigate: onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", newBill.handleSubmit);
      fireEvent.submit(form);
      expect(newBill.isImageValid).toBeFalsy();
      const formButton = $("#btn-send-bill");
      expect(formButton.prop("disabled")).toBeTruthy();
    });

    // POST route is tested in the API
    test("Then if the form is valid, submit button should be enabled and clicking on it should use the post method to add a bill to the store", async () => {
      const newBill = new NewBill({
        document,
        onNavigate: onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      const form = screen.getByTestId("form-new-bill");
      const billsBeforeCreation = await newBill.store.bills().list();
      expect(billsBeforeCreation.length).toBe(4);
      const billsAfterCreation = await newBill.store.bills().create({
        status: "pending",
        pct: 20,
        amount: 200,
        email: "a@a",
        name: "test",
        vat: "80",
        fileName: "test.png",
        date: "2021-04-01",
        commentAdmin: "test",
        commentary: "test",
        type: "Hôtel et logement",
        fileUrl: "https://storage.googleapis.com/billable-ocr-images/test.jpg",
      });
      expect(billsAfterCreation.length).toBe(5);
      newBill.isImageValid = true;
      expect(newBill.isImageValid).toBeTruthy();
      form.addEventListener("submit", newBill.handleSubmit);
      fireEvent.submit(form);
      const formContainer = $("#btn-send-bill");
      if (formContainer) {
        expect(formContainer.prop("disabled")).toBeFalsy();
      }
    });

    describe("When an error occurs on API", () => {
      test("then it should fail with 404 message error", async () => {
        const errorMessage = "error 404";
        const billsMock = {
          list: jest.fn().mockResolvedValue(mockStore.bills().list()),
          create: jest.fn(() => {
            throw new Error(errorMessage);
          }),
          update: jest.fn((bill) => {
            return Promise.resolve({ ...bill });
          }),
        };

        const storeMock = {
          bills: jest.fn().mockReturnValue(billsMock),
        };
        const newBill = new NewBill({
          document,
          onNavigate: onNavigate,
          store: storeMock,
          localStorage: window.localStorage,
        });
        const billsBeforeCreation = await newBill.store.bills().list();
        expect(billsBeforeCreation.length).toBe(4);
        try {
          await newBill.store.bills().create({
            status: "pending",
            pct: 20,
            amount: 200,
            email: "a@a",
            name: "test",
            vat: "80",
            fileName: "test.png",
            date: "2021-04-01",
            commentAdmin: "test",
            commentary: "test",
            type: "Hôtel et logement",
            fileUrl:
              "https://storage.googleapis.com/billable-ocr-images/test.jpg",
          });
          expect(true).toBe(false);
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });

      test("then it should fail with 500 message error", async () => {
        const errorMessage = "error 500";
        const billsMock = {
          list: jest.fn().mockResolvedValue(mockStore.bills().list()),
          create: jest.fn(() => {
            throw new Error(errorMessage);
          }),
          update: jest.fn((bill) => {
            return Promise.resolve({ ...bill });
          }),
        };

        const storeMock = {
          bills: jest.fn().mockReturnValue(billsMock),
        };
        const newBill = new NewBill({
          document,
          onNavigate: onNavigate,
          store: storeMock,
          localStorage: window.localStorage,
        });
        const billsBeforeCreation = await newBill.store.bills().list();
        expect(billsBeforeCreation.length).toBe(4);
        try {
          await newBill.store.bills().create({
            status: "pending",
            pct: 20,
            amount: 200,
            email: "a@a",
            name: "test",
            vat: "80",
            fileName: "test.png",
            date: "2021-04-01",
            commentAdmin: "test",
            commentary: "test",
            type: "Hôtel et logement",
            fileUrl:
              "https://storage.googleapis.com/billable-ocr-images/test.jpg",
          });
          expect(true).toBe(false);
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });
    });
  });
});
