/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes";
import mockStore from "../__mocks__/store";
import Bills from "../containers/Bills";
import { localStorageMock } from "../__mocks__/localStorage.js";
import router from "../app/Router";

jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  beforeAll(() => {
    const { getComputedStyle } = window;
    window.getComputedStyle = (elt) => getComputedStyle(elt);
  });
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon.className).toBe("active-icon");
    });

    test("Then bills should be ordered from earliest to latest", async () => {
      const onNavigate = (pathname) =>
        (document.body.innerHTML = ROUTES({ pathname }));
      const billsContainer = new Bills({
        document,
        onNavigate,
        store: mockStore,
        localStorage: null,
      });
      const results = await billsContainer.getBills();
      const dates = results.map((result) => result.date);
      const antiChrono = (a, b) => (new Date(a) < new Date(b) ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);

      expect(dates).toEqual(datesSorted);
    });

    test("Then all eye icons should be attached to an event listener to the handleClickIconEye function", () => {
      const onNavigate = (pathname) =>
        (document.body.innerHTML = ROUTES({ pathname }));
      const billsHTML = BillsUI({ data: bills });
      document.body.innerHTML = billsHTML;

      const billsContainer = new Bills({
        document,
        onNavigate,
        store: mockStore,
        localStorage: null,
      });

      $.fn.modal = jest.fn();

      const eye = screen.getAllByTestId("icon-eye");
      expect(eye.length).toBe(4);
      eye.forEach((icon) => {
        const handleClickIconEye = jest.fn(() =>
          billsContainer.handleClickIconEye(icon)
        );

        icon.addEventListener("click", handleClickIconEye);
        userEvent.click(icon);

        expect(handleClickIconEye).toHaveBeenCalled();
      });
    });

    test("then it should fetch bills from mock API GET", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ type: "Admin", email: "a@a" })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByText("Mes notes de frais"));

      const contentPending = screen.queryAllByRole("cell", {
        name: "En attente",
      });
      expect(contentPending).toHaveLength(1);
      const contentApproved = screen.queryAllByRole("cell", {
        name: "Accepté",
      });
      expect(contentApproved).toHaveLength(1);
      const contentRefused = screen.queryAllByRole("cell", { name: "Refusé" });
      expect(contentRefused).toHaveLength(2);
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Admin",
            email: "a@a",
          })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });
      test("then it should fetch bills from an API and fail with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("then it should fetch bills from an API and fail with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });

        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});
