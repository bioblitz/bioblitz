const path = require("path");
const admin = require("firebase-admin");

const serviceAccountPath = path.resolve(process.cwd(), "../firebase-service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccountPath) });
}

const db = admin.firestore();

const todayPst = new Date().toLocaleDateString("en-CA", {
  timeZone: "America/Los_Angeles",
});

const potd = {
  title: "Guttation",
  topic: "Plants",
  date: todayPst,
  question:
    "Being an avid cultivator of crop, Anish notices that the morning after rainfall, many leaved plants in his garden have droplets of liquid along the edges of their leaves. Which best explains this?",
  a: "Guard cells are more numerous near the edges of leaves",
  b: "Sugars, like sucrose, accumulate in the margins of leaves due to diffusion",
  c: "Vascular endings near the leaf's edges release sap because root pressure is high",
  d: "The waxy cuticle creates a \"gutter\" to collect the water",
  e: "Mesophyll cells experience slight plasmolysis at night, releasing water",
  options: [
    { key: "a", text: "Guard cells are more numerous near the edges of leaves" },
    { key: "b", text: "Sugars, like sucrose, accumulate in the margins of leaves due to diffusion" },
    { key: "c", text: "Vascular endings near the leaf's edges release sap because root pressure is high" },
    { key: "d", text: "The waxy cuticle creates a \"gutter\" to collect the water" },
    { key: "e", text: "Mesophyll cells experience slight plasmolysis at night, releasing water" },
  ],
  correct: ["c"],
  multiSelect: false,
  difficulty: "Medium",
  explanation:
    "This describes guttation — the process by which plants exude xylem sap as droplets through hydathodes, which are pores located at the tips and margins of leaves associated with vascular (xylem) endings. When root pressure is high (e.g., after rainfall saturates the soil) and transpiration is low (e.g., at night or early morning), water is pushed up through the xylem and forced out through hydathodes. Guard cells (A) control stomata, not hydathodes. Sucrose diffusion (B) does not cause liquid droplets. The cuticle (D) is waterproof and does not collect water. Plasmolysis (E) involves cells losing water, not releasing it externally.",
  imageUrl: "",
  imageAlt: "",
  publishedAt: admin.firestore.FieldValue.serverTimestamp(),
  publishedBy: "manual-script",
};

async function main() {
  const docRef = db.collection("potd").doc();
  await docRef.set(potd);
  console.log(`Published POTD for ${todayPst} with id: ${docRef.id}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
