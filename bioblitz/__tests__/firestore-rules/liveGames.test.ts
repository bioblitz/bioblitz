// The live blitz standings are only meaningful if the answer key stays hidden
// and every write goes through the server, so those two properties are worth
// pinning down in the rules themselves.
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

let testEnv: RulesTestEnvironment;

const PROJECT_ID = "bioblitz-live-rules-test";

const HOST = "uid_host";
const PLAYER = "uid_player";
const GHOST = "uid_ghost";
const OUTSIDER = "uid_outsider";

const LIVE_ID = "live_1";
const CODE = "ABC234";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(
        path.resolve(__dirname, "../../firestore.rules"),
        "utf8",
      ),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `liveGames/${LIVE_ID}`), {
      gameId: "set_1",
      hostId: HOST,
      joinCode: CODE,
      status: "running",
      phase: "answering",
      phaseSeq: 3,
      currentQuestion: 0,
      questionCount: 5,
      revealed: {},
    });
    await setDoc(doc(db, `liveGames/${LIVE_ID}/players/${PLAYER}`), {
      uid: PLAYER,
      username: "Player",
      answers: {},
      correctCount: 0,
      totalMs: 0,
      ghost: false,
    });
    await setDoc(doc(db, `liveGames/${LIVE_ID}/players/${GHOST}`), {
      uid: GHOST,
      username: "Ghost",
      answers: {},
      correctCount: 0,
      totalMs: 0,
      ghost: true,
    });
    await setDoc(doc(db, `liveGames/${LIVE_ID}/content/questions`), {
      questions: [{ id: "q1", content: "Which organelle makes ATP?", choices: [] }],
    });
    await setDoc(doc(db, `liveGames/${LIVE_ID}/content/answers`), {
      answerKey: { "0": "b" },
      // Written explanations live with the answer key, not the questions:
      // they give the answer away, so they stay unreadable until the host
      // publishes one onto the game doc at reveal.
      solutions: { "0": "Mitochondria run oxidative phosphorylation." },
    });
    await setDoc(doc(db, `liveJoinCodes/${CODE}`), { liveGameId: LIVE_ID });
  });
});

describe("live game state", () => {
  it("lets any signed-in user follow the room", async () => {
    const db = testEnv.authenticatedContext(PLAYER).firestore();
    await assertSucceeds(getDoc(doc(db, `liveGames/${LIVE_ID}`)));
    await assertSucceeds(
      getDoc(doc(db, `liveGames/${LIVE_ID}/players/${PLAYER}`)),
    );
  });

  it("hides the room from signed-out visitors", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `liveGames/${LIVE_ID}`)));
  });

  it("refuses client writes to the phase, even from the host", async () => {
    const db = testEnv.authenticatedContext(HOST).firestore();
    await assertFails(
      updateDoc(doc(db, `liveGames/${LIVE_ID}`), { phase: "final" }),
    );
    await assertFails(deleteDoc(doc(db, `liveGames/${LIVE_ID}`)));
  });

  it("refuses a player rewriting their own score", async () => {
    const db = testEnv.authenticatedContext(PLAYER).firestore();
    await assertFails(
      updateDoc(doc(db, `liveGames/${LIVE_ID}/players/${PLAYER}`), {
        correctCount: 99,
        totalMs: 0,
      }),
    );
  });

  it("refuses a ghost promoting themselves onto the leaderboard", async () => {
    const db = testEnv.authenticatedContext(GHOST).firestore();
    await assertFails(
      updateDoc(doc(db, `liveGames/${LIVE_ID}/players/${GHOST}`), {
        ghost: false,
      }),
    );
  });

  it("refuses a player demoting someone else to a ghost", async () => {
    const db = testEnv.authenticatedContext(PLAYER).firestore();
    await assertFails(
      updateDoc(doc(db, `liveGames/${LIVE_ID}/players/${GHOST}`), {
        ghost: true,
      }),
    );
    // The host has no special write access either.
    const hostDb = testEnv.authenticatedContext(HOST).firestore();
    await assertFails(
      updateDoc(doc(hostDb, `liveGames/${LIVE_ID}/players/${PLAYER}`), {
        ghost: true,
      }),
    );
  });

  it("refuses a player writing an answer straight to Firestore", async () => {
    const db = testEnv.authenticatedContext(PLAYER).firestore();
    await assertFails(
      updateDoc(doc(db, `liveGames/${LIVE_ID}/players/${PLAYER}`), {
        "answers.0": { choice: "b", elapsedMs: 1, locked: true, correct: true },
      }),
    );
  });
});

describe("live game content", () => {
  it("serves the questions to players", async () => {
    const db = testEnv.authenticatedContext(PLAYER).firestore();
    await assertSucceeds(
      getDoc(doc(db, `liveGames/${LIVE_ID}/content/questions`)),
    );
  });

  it("keeps the answer key and its explanations unreadable, host included", async () => {
    const playerDb = testEnv.authenticatedContext(PLAYER).firestore();
    await assertFails(
      getDoc(doc(playerDb, `liveGames/${LIVE_ID}/content/answers`)),
    );

    const hostDb = testEnv.authenticatedContext(HOST).firestore();
    await assertFails(
      getDoc(doc(hostDb, `liveGames/${LIVE_ID}/content/answers`)),
    );

    const outsiderDb = testEnv.authenticatedContext(OUTSIDER).firestore();
    await assertFails(
      getDoc(doc(outsiderDb, `liveGames/${LIVE_ID}/content/answers`)),
    );
  });

  it("does not leak explanations through the public questions doc", async () => {
    const db = testEnv.authenticatedContext(PLAYER).firestore();
    const snap = await getDoc(
      doc(db, `liveGames/${LIVE_ID}/content/questions`),
    );
    const questions = snap.data()?.questions as Record<string, unknown>[];
    questions.forEach((question) => {
      expect(question.solution).toBeUndefined();
      expect(question.explanation).toBeUndefined();
    });
  });

  it("refuses client writes to either content doc", async () => {
    const db = testEnv.authenticatedContext(HOST).firestore();
    await assertFails(
      setDoc(doc(db, `liveGames/${LIVE_ID}/content/answers`), { answerKey: {} }),
    );
    await assertFails(
      setDoc(doc(db, `liveGames/${LIVE_ID}/content/questions`), { questions: [] }),
    );
  });
});

describe("join codes", () => {
  it("cannot be read or enumerated by clients", async () => {
    const db = testEnv.authenticatedContext(PLAYER).firestore();
    await assertFails(getDoc(doc(db, `liveJoinCodes/${CODE}`)));
  });

  it("cannot be claimed by a client", async () => {
    const db = testEnv.authenticatedContext(HOST).firestore();
    await assertFails(
      setDoc(doc(db, "liveJoinCodes/ZZZ999"), { liveGameId: "whatever" }),
    );
  });
});
