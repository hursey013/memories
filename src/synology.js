import { isSameMonthDayPastYear } from "./utils/date.js";
import { fetchJson } from "./net/http.js";
import { config } from "./config.js";

export class SynologyClient {
  constructor({ ip, user, password, fotoSpace }) {
    this.ip = ip;
    this.user = user;
    this.password = password;
    this.fotoSpace = fotoSpace; // "Foto" or "FotoTeam"
  }

  async authenticate() {
    const url = `https://${this.ip}/photo/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${encodeURIComponent(
      this.user,
    )}&passwd=${encodeURIComponent(this.password)}`;
    const data = await fetchJson(url, {
      insecure: true,
      timeoutMs: config.http.timeoutMs,
      retries: config.http.retries,
    });
    const sid = data?.data?.sid;
    if (!sid) throw new Error("Failed to authenticate with Synology Photos (no SID)");
    return sid;
  }

  async listAllPhotos(sid, { limit = 5000 } = {}) {
    let offset = 0;
    const all = [];
    while (true) {
      const url = `https://${this.ip}/photo/webapi/entry.cgi?api=SYNO.${this.fotoSpace}.Browse.Item&version=1&method=list&type=photo&offset=${offset}&limit=${limit}&_sid=${sid}&additional=${encodeURIComponent(
        JSON.stringify(["thumbnail", "address"]),
      )}`;
      const data = await fetchJson(url, {
        insecure: true,
        timeoutMs: config.http.timeoutMs,
        retries: config.http.retries,
      });
      const list = data?.data?.list || [];
      if (list.length === 0) break;
      all.push(...list);
      offset += limit;
    }
    return all;
  }

  getThumbnailUrl(sid, photo, { size = "xl" } = {}) {
    const { id, cache_key } = photo;

    return `https://${this.ip}/photo/webapi/entry.cgi?api=SYNO.${this.fotoSpace}.Thumbnail&version=1&method=get&mode=download&id=${id == cache_key.split("_")[0] ? id : cache_key.split("_")[0]}&type=unit&size=${size}&cache_key=${cache_key}&_sid=${sid}&verify=false`;
  }

  filterPhotosByMonthDay(photos, day, month) {
    const currentYear = new Date().getFullYear();
    return photos.filter((p) => {
      const taken = new Date(p.time * 1000);
      return isSameMonthDayPastYear(taken, day, month, currentYear);
    });
  }
}
