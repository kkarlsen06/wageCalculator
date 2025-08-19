import { getUserId } from "../src/lib/auth/getUserId.js";

(async () => {
  const id = await getUserId();
  console.log("Resolved userId:", id);
})();
