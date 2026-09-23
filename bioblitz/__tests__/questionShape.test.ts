import { EditableQuestion } from "@/types";
import {
  editableToStored,
  normalizeDifficulty,
  normalizeTopic,
  storedToEditable,
  stripHtml,
  validateEditableQuestion,
} from "@/lib/questionShape";

const single: EditableQuestion = {
  id: "q1",
  content: "<p>Which organelle makes ATP?</p>",
  imageUrl: "https://example.com/mito.png",
  choices: [
    { id: "1", text: "Nucleus" },
    { id: "2", text: "Mitochondrion" },
    { id: "3", text: "Ribosome" },
  ],
  correctAnswerIds: ["2"],
  isMultiSelect: false,
  solution: "Oxidative phosphorylation happens there.",
};

const multi: EditableQuestion = {
  ...single,
  id: "q2",
  correctAnswerIds: ["1", "3"],
  isMultiSelect: true,
};

describe("editableToStored", () => {
  it("maps choices onto letters and stores a single correct letter", () => {
    const stored = editableToStored(single);
    expect(stored.a).toBe("Nucleus");
    expect(stored.b).toBe("Mitochondrion");
    expect(stored.c).toBe("Ribosome");
    expect(stored.correct).toBe("b");
    expect(stored.multipleCorrect).toBeUndefined();
    expect(stored.imgURL).toBe("https://example.com/mito.png");
  });

  it("stores an array of letters for multi-select questions", () => {
    const stored = editableToStored(multi);
    expect(stored.correct).toEqual(["a", "c"]);
    expect(stored.multipleCorrect).toBe(true);
  });

  it("strips the &nbsp; entities the editor leaves behind", () => {
    const stored = editableToStored({ ...single, content: "<p>a&nbsp;b</p>" });
    expect(stored.content).toBe("<p>a b</p>");
  });
});

describe("storedToEditable", () => {
  it("round-trips a single-answer question", () => {
    const back = storedToEditable(editableToStored(single));
    expect(back.choices.map((c) => c.text)).toEqual([
      "Nucleus",
      "Mitochondrion",
      "Ribosome",
    ]);
    expect(back.correctAnswerIds).toEqual(["2"]);
    expect(back.isMultiSelect).toBe(false);
    expect(back.imageUrl).toBe(single.imageUrl);
  });

  it("round-trips a multi-answer question", () => {
    const back = storedToEditable(editableToStored(multi));
    expect(back.correctAnswerIds).toEqual(["1", "3"]);
    expect(back.isMultiSelect).toBe(true);
  });

  it("falls back to the given id when the document has none", () => {
    expect(storedToEditable({ content: "x" }, "doc-id").id).toBe("doc-id");
  });
});

describe("normalizers", () => {
  it("accepts known difficulties case-insensitively and defaults to Medium", () => {
    expect(normalizeDifficulty("hard")).toBe("Hard");
    expect(normalizeDifficulty("")).toBe("Medium");
    expect(normalizeDifficulty("impossible")).toBe("Medium");
  });

  it("canonicalizes known topics and keeps unknown ones", () => {
    expect(normalizeTopic("cell biology")).toBe("Cell Biology");
    expect(normalizeTopic("Biochemistry")).toBe("Biochemistry");
    expect(normalizeTopic("")).toBe("Other");
  });

  it("strips markup for search text", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });
});

describe("validateEditableQuestion", () => {
  it("passes a complete question", () => {
    expect(validateEditableQuestion(single)).toEqual([]);
  });

  it("rejects empty content, thin choices and missing answers", () => {
    const errors = validateEditableQuestion({
      id: "bad",
      content: "<p><br></p>",
      choices: [{ id: "1", text: "Only one" }],
      correctAnswerIds: [],
    });
    expect(errors).toHaveLength(3);
  });

  it("rejects blank answer choices", () => {
    const errors = validateEditableQuestion({
      ...single,
      choices: [
        { id: "1", text: "Nucleus" },
        { id: "2", text: "   " },
      ],
      correctAnswerIds: ["1"],
    });
    expect(errors).toContain("Answer choice text cannot be empty.");
  });
});
