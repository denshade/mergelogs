import { within, userEvent, expect } from "storybook/test";
import Home from "../app/page";

export default {
  title: "App/Page",
  component: Home,
};

export const Default = {};

const logLines1 = `2024-03-13T10:00:00.000Z	First log message`;
const loglines2 = `2024-03-13T12:00:00.000Z	Second log message`;
export const AddingTwoValidLogLines = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const sourceInput = canvas.getByLabelText(/source name/i);
    await userEvent.type(sourceInput, "Test Source");

    const logsTextarea = canvas.getByLabelText(/paste log lines/i);
    await userEvent.clear(logsTextarea);
    await userEvent.type(logsTextarea, logLines1);

    const addButton = canvas.getByRole("button", { name: /add source/i });
    await userEvent.click(addButton);

    await userEvent.clear(logsTextarea);
    await userEvent.type(logsTextarea, loglines2);
    
    await userEvent.click(canvas.getByRole("button", { name: /add source/i }));

    expect(canvas.getByText(/Merged log \(2 lines\)/i)).toBeTruthy();
    expect(canvas.getByText("First log message")).toBeTruthy();
    expect(canvas.getByText("Second log message")).toBeTruthy();
    expect(canvas.getByText("Test Source")).toBeTruthy();
  },
};
