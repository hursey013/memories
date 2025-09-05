import PocketBase from "pocketbase";

const { PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD, PB_COLLECTION = "sent_photos" } = process.env;

let pb;

export async function getPB() {
  if (!pb) {
    pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
  }
  return pb;
}

export function collectionName() {
  return PB_COLLECTION;
}
