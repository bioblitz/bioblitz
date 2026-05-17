//ok so this basically just tests that our Firestore rules are actually working, this is going to be very important once we have messaging because if something goes wrong everyone's messages could be exposed
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

let testEnv: RulesTestEnvironment;

const PROJECT_ID = "bioblitz-rules-test";

const ALICE = "uid_alice";
const BOB = "uid_bob";
const CAROL = "uid_carol";

function convId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

const ALICE_BOB_CONV = convId(ALICE, BOB);

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
    await setDoc(doc(db, `users/${ALICE}`), {
      displayName: "Alice",
      blockedUserIds: [],
    });
    await setDoc(doc(db, `users/${BOB}`), {
      displayName: "Bob",
      blockedUserIds: [],
    });
    await setDoc(doc(db, `users/${CAROL}`), {
      displayName: "Carol",
      blockedUserIds: [],
    });
  });
});

// ---- Helpers ----

async function makeMutualFriends(uidA: string, uidB: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `users/${uidA}/friends/${uidB}`), {
      uid: uidB,
      status: "friends",
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, `users/${uidB}/friends/${uidA}`), {
      uid: uidA,
      status: "friends",
      createdAt: serverTimestamp(),
    });
  });
}

async function makePending(uidA: string, uidB: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `users/${uidA}/friends/${uidB}`), {
      uid: uidB,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  });
}

async function block(blockerUid: string, blockedUid: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const userDoc = await getDoc(doc(db, `users/${blockerUid}`));
    const current = userDoc.data()?.blockedUserIds || [];
    await setDoc(
      doc(db, `users/${blockerUid}`),
      { blockedUserIds: [...current, blockedUid] },
      { merge: true },
    );
  });
}

async function seedConversation(uidA: string, uidB: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `conversations/${convId(uidA, uidB)}`), {
      participantIds: [uidA, uidB].sort(),
      lastMessageAt: serverTimestamp(),
      lastMessagePreview: "",
      lastMessageSenderId: "",
      lastMessageType: "text",
      unreadCounts: { [uidA]: 0, [uidB]: 0 },
      createdAt: serverTimestamp(),
    });
  });
}

function validConversationPayload(uidA: string, uidB: string) {
  return {
    participantIds: [uidA, uidB].sort(),
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: "",
    lastMessageSenderId: "",
    lastMessageType: "text",
    unreadCounts: { [uidA]: 0, [uidB]: 0 },
    createdAt: serverTimestamp(),
  };
}

function validMessagePayload(senderId: string, text = "hello") {
  return {
    senderId,
    text,
    type: "text",
    createdAt: serverTimestamp(),
    reactions: {},
  };
}

// =====================================================================
// CONVERSATION CREATION
// =====================================================================

describe("conversation creation", () => {
  test("mutual friends can create a conversation", async () => {
    await makeMutualFriends(ALICE, BOB);
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(
      setDoc(
        doc(aliceDb, `conversations/${ALICE_BOB_CONV}`),
        validConversationPayload(ALICE, BOB),
      ),
    );
  });

  test("non-friends cannot create a conversation", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(
        doc(aliceDb, `conversations/${ALICE_BOB_CONV}`),
        validConversationPayload(ALICE, BOB),
      ),
    );
  });

  test("pending friend request is not enough", async () => {
    await makePending(ALICE, BOB);
    await makePending(BOB, ALICE);
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(
        doc(aliceDb, `conversations/${ALICE_BOB_CONV}`),
        validConversationPayload(ALICE, BOB),
      ),
    );
  });

  test("one-sided friendship cannot create a conversation", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${ALICE}/friends/${BOB}`), {
        uid: BOB,
        status: "friends",
        createdAt: serverTimestamp(),
      });
    });
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(
        doc(aliceDb, `conversations/${ALICE_BOB_CONV}`),
        validConversationPayload(ALICE, BOB),
      ),
    );
  });

  test("blocked user cannot create a conversation", async () => {
    await makeMutualFriends(ALICE, BOB);
    await block(BOB, ALICE);
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(
        doc(aliceDb, `conversations/${ALICE_BOB_CONV}`),
        validConversationPayload(ALICE, BOB),
      ),
    );
  });

  test("non-participant cannot create a conversation", async () => {
    await makeMutualFriends(ALICE, BOB);
    const carolDb = testEnv.authenticatedContext(CAROL).firestore();
    await assertFails(
      setDoc(
        doc(carolDb, `conversations/${ALICE_BOB_CONV}`),
        validConversationPayload(ALICE, BOB),
      ),
    );
  });

  test("unsigned user cannot create a conversation", async () => {
    await makeMutualFriends(ALICE, BOB);
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(
        doc(anonDb, `conversations/${ALICE_BOB_CONV}`),
        validConversationPayload(ALICE, BOB),
      ),
    );
  });

  test("unread counts must start at 0", async () => {
    await makeMutualFriends(ALICE, BOB);
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    const payload = validConversationPayload(ALICE, BOB);
    payload.unreadCounts = { [ALICE]: 5, [BOB]: 0 };
    await assertFails(
      setDoc(doc(aliceDb, `conversations/${ALICE_BOB_CONV}`), payload),
    );
  });
});

// =====================================================================
// CONVERSATION READS
// =====================================================================

describe("conversation reads", () => {
  beforeEach(async () => {
    await makeMutualFriends(ALICE, BOB);
    await seedConversation(ALICE, BOB);
  });

  test("participant can read", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(
      getDoc(doc(aliceDb, `conversations/${ALICE_BOB_CONV}`)),
    );
  });

  test("non-participant cannot read", async () => {
    const carolDb = testEnv.authenticatedContext(CAROL).firestore();
    await assertFails(getDoc(doc(carolDb, `conversations/${ALICE_BOB_CONV}`)));
  });

  test("unsigned user cannot read", async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonDb, `conversations/${ALICE_BOB_CONV}`)));
  });
});

describe("message creation", () => {
  beforeEach(async () => {
    await makeMutualFriends(ALICE, BOB);
    await seedConversation(ALICE, BOB);
  });

  test("participant can send a message", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(
      setDoc(
        doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`),
        validMessagePayload(ALICE),
      ),
    );
  });

  test("non-participant cannot send a message", async () => {
    const carolDb = testEnv.authenticatedContext(CAROL).firestore();
    await assertFails(
      setDoc(
        doc(carolDb, `conversations/${ALICE_BOB_CONV}/messages/m1`),
        validMessagePayload(CAROL),
      ),
    );
  });

  test("sender cannot impersonate another user", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(
        doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`),
        validMessagePayload(BOB),
      ),
    );
  });

  test("message text over 1000 chars is rejected", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    const longText = "a".repeat(1001);
    await assertFails(
      setDoc(
        doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`),
        validMessagePayload(ALICE, longText),
      ),
    );
  });

  test("message text exactly 1000 chars is allowed", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    const text = "a".repeat(1000);
    await assertSucceeds(
      setDoc(
        doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`),
        validMessagePayload(ALICE, text),
      ),
    );
  });

  test("invalid message type is rejected", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`), {
        ...validMessagePayload(ALICE),
        type: "image",
      }),
    );
  });

  test("challenge_sent type is allowed", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`), {
        ...validMessagePayload(ALICE),
        type: "challenge_sent",
        challengeId: "ch_123",
      }),
    );
  });

  test("cannot send after friendship is broken", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, `users/${ALICE}/friends/${BOB}`), {
        uid: BOB,
        status: "pending",
      });
    });
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(
        doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`),
        validMessagePayload(ALICE),
      ),
    );
  });

  test("cannot send after being blocked", async () => {
    await block(BOB, ALICE);
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(
        doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`),
        validMessagePayload(ALICE),
      ),
    );
  });
});

describe("message reads", () => {
  beforeEach(async () => {
    await makeMutualFriends(ALICE, BOB);
    await seedConversation(ALICE, BOB);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), `conversations/${ALICE_BOB_CONV}/messages/m1`),
        validMessagePayload(ALICE),
      );
    });
  });

  test("participant can read messages", async () => {
    const bobDb = testEnv.authenticatedContext(BOB).firestore();
    await assertSucceeds(
      getDoc(doc(bobDb, `conversations/${ALICE_BOB_CONV}/messages/m1`)),
    );
  });

  test("non-participant cannot read messages", async () => {
    const carolDb = testEnv.authenticatedContext(CAROL).firestore();
    await assertFails(
      getDoc(doc(carolDb, `conversations/${ALICE_BOB_CONV}/messages/m1`)),
    );
  });

  test("history still readable after unfriending", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, `users/${ALICE}/friends/${BOB}`), {
        uid: BOB,
        status: "pending",
      });
    });
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(
      getDoc(doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`)),
    );
  });
});

describe("message updates", () => {
  beforeEach(async () => {
    await makeMutualFriends(ALICE, BOB);
    await seedConversation(ALICE, BOB);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), `conversations/${ALICE_BOB_CONV}/messages/m1`),
        validMessagePayload(ALICE),
      );
    });
  });

  test("participant can add a reaction", async () => {
    const bobDb = testEnv.authenticatedContext(BOB).firestore();
    const { updateDoc } = await import("firebase/firestore");
    await assertSucceeds(
      updateDoc(doc(bobDb, `conversations/${ALICE_BOB_CONV}/messages/m1`), {
        reactions: { [BOB]: "🔥" },
      }),
    );
  });
  test("non-participant cannot react", async () => {
    const carolDb = testEnv.authenticatedContext(CAROL).firestore();
    const { updateDoc } = await import("firebase/firestore");
    await assertFails(
      updateDoc(doc(carolDb, `conversations/${ALICE_BOB_CONV}/messages/m1`), {
        reactions: { [CAROL]: "🔥" },
      }),
    );
  });

  test("cannot edit message text", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    const { updateDoc } = await import("firebase/firestore");
    await assertFails(
      updateDoc(doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`), {
        text: "edited!",
      }),
    );
  });

  test("cannot change senderId", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    const { updateDoc } = await import("firebase/firestore");
    await assertFails(
      updateDoc(doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`), {
        senderId: BOB,
      }),
    );
  });

  test("sender can soft-delete their own message", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    const { updateDoc } = await import("firebase/firestore");
    await assertSucceeds(
      updateDoc(doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`), {
        deletedAt: serverTimestamp(),
        deletedBy: ALICE,
      }),
    );
  });

  test("non-sender cannot soft-delete another's message", async () => {
    const bobDb = testEnv.authenticatedContext(BOB).firestore();
    const { updateDoc } = await import("firebase/firestore");
    await assertFails(
      updateDoc(doc(bobDb, `conversations/${ALICE_BOB_CONV}/messages/m1`), {
        deletedAt: serverTimestamp(),
        deletedBy: BOB,
      }),
    );
  });
});

describe("message hard delete", () => {
  beforeEach(async () => {
    await makeMutualFriends(ALICE, BOB);
    await seedConversation(ALICE, BOB);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), `conversations/${ALICE_BOB_CONV}/messages/m1`),
        validMessagePayload(ALICE),
      );
    });
  });

  test("nobody can hard-delete a message", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    const { deleteDoc } = await import("firebase/firestore");
    await assertFails(
      deleteDoc(doc(aliceDb, `conversations/${ALICE_BOB_CONV}/messages/m1`)),
    );
  });
});

describe("message reports", () => {
  test("any signed-in user can file a report", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, `messageReports/r1`), {
        conversationId: ALICE_BOB_CONV,
        messageId: "m1",
        messageText: "bad text",
        senderUid: BOB,
        reportedByUid: ALICE,
        reason: "harassment",
        createdAt: serverTimestamp(),
        status: "pending",
      }),
    );
  });

  test("user cannot file a report claiming to be someone else", async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(doc(aliceDb, `messageReports/r1`), {
        conversationId: ALICE_BOB_CONV,
        messageId: "m1",
        messageText: "bad text",
        senderUid: BOB,
        reportedByUid: CAROL,
        reason: "harassment",
        createdAt: serverTimestamp(),
        status: "pending",
      }),
    );
  });

  test("non-staff cannot read message reports", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `messageReports/r1`), {
        conversationId: ALICE_BOB_CONV,
        messageId: "m1",
        reportedByUid: ALICE,
        status: "pending",
      });
    });
    const aliceDb = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(getDoc(doc(aliceDb, `messageReports/r1`)));
  });
});
