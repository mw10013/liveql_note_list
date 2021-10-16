import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing";
import App from "./App";

jest.setTimeout(10_000);

test("fetches clip with network request error", async () => {
  render(<App />);
  const fetch = screen.getByRole("button", { name: /fetch/i });
  expect(fetch).toBeInTheDocument();

  userEvent.click(fetch);
  const alert = await screen.findByRole("alert", {}, { timeout: 8_000 });
  // screen.debug();
  expect(alert).toHaveTextContent(/network request failed/i);
});
