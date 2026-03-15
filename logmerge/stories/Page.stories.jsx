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

const logLineSpaceFormat = `2024-03-13 10:00:00.000Z	Log with space-separated datetime`;
export const SupportsSpaceSeparatedDateTime = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const sourceInput = canvas.getByLabelText(/source name/i);
    await userEvent.type(sourceInput, "Space Format Source");

    const logsTextarea = canvas.getByLabelText(/paste log lines/i);
    await userEvent.clear(logsTextarea);
    await userEvent.type(logsTextarea, logLineSpaceFormat);

    const addButton = canvas.getByRole("button", { name: /add source/i });
    await userEvent.click(addButton);

    expect(canvas.getByText(/Merged log \(1 lines?\)/i)).toBeTruthy();
    expect(canvas.getByText("Log with space-separated datetime")).toBeTruthy();
    expect(canvas.getByText("Space Format Source")).toBeTruthy();
  },
};

/** Logs with datetime in column 1 (0-based). Column 0 = label, column 1 = timestamp, column 2 = message. */
const logLinesColumn1 = `level	2024-03-13T14:00:00.000Z	Later message
level	2024-03-13T11:00:00.000Z	Earlier message`;

export const UsingColumn1AsDatetime = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const datetimeColInput = canvas.getByLabelText(/datetime column/i);
    await userEvent.clear(datetimeColInput);
    await userEvent.type(datetimeColInput, "1");

    const sourceInput = canvas.getByLabelText(/source name/i);
    await userEvent.type(sourceInput, "Column1 Source");

    const logsTextarea = canvas.getByLabelText(/paste log lines/i);
    await userEvent.clear(logsTextarea);
    await userEvent.type(logsTextarea, logLinesColumn1);

    const addButton = canvas.getByRole("button", { name: /add source/i });
    await userEvent.click(addButton);

    expect(canvas.getByText(/Merged log \(2 lines\)/i)).toBeTruthy();
    const rows = canvas.getAllByRole("row");
    // Header + 2 data rows; earlier (11:00) should be first
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const table = canvas.getByRole("table");
    expect(table).toBeTruthy();
    expect(table.textContent).toMatch(/11:00:00/);
    expect(table.textContent).toMatch(/14:00:00/);
    // Earlier message should appear before later in the table (sorted by column 1 datetime)
    const bodyText = table.textContent;
    const posEarlier = bodyText.indexOf("Earlier message");
    const posLater = bodyText.indexOf("Later message");
    expect(posEarlier).toBeLessThan(posLater);
  },
};

const invalidLogLine = `not a timestamp	This line has no valid ISO date at the start`;
export const ShowsFormatErrorBelowTextarea = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const logsTextarea = canvas.getByLabelText(/paste log lines/i);
    await userEvent.clear(logsTextarea);
    await userEvent.type(logsTextarea, invalidLogLine);

    const errorMessage = canvas.getByRole("alert");
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.textContent).toContain("Line 1: line must start with ISO date/time (e.g. 2024-03-13T10:00:00.000Z or 2024-03-13 10:00:00.000Z)");
  },
};
