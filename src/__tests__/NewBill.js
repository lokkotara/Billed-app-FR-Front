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

    test("Then if the form is valid, submit button should be enabled", async () => {
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
  });
});
