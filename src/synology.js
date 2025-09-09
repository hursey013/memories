import { fetchJson } from "./http.js";
import { config } from "./config.js";
import { photoUID } from "./utils.js";

/** Synology client with efficient day-focused listing using start_time/end_time. */
export class SynologyClient {
  constructor({ ip, user, password, fotoSpace }) {
    this.ip = ip;
    this.user = user;
    this.password = password;
    this.fotoSpace = fotoSpace;
  }
  async authenticate() {
    const url = `http://${this.ip}/photo/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${encodeURIComponent(this.user)}&passwd=${encodeURIComponent(this.password)}`;
    const data = await fetchJson(url, {
      timeoutMs: config.http.timeoutMs,
      retries: config.http.retries,
    });
    if (!data?.data?.sid) throw new Error("Auth failed");
    return data.data.sid;
  }
  async logout(sid) {
    try {
      const url = `http://${this.ip}/photo/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=logout&_sid=${sid}`;
      await fetchJson(url, {
        timeoutMs: config.http.timeoutMs,
        retries: config.http.retries,
      });
    } catch {}
  }

  async listItems({ sid, offset = 0, limit = 1000, start_time, end_time }) {
    const params = new URLSearchParams({
      api: "SYNO.Foto.Browse.Item",
      version: "5",
      method: "list",
      offset: String(offset),
      limit: String(limit),
      additional: JSON.stringify(["thumbnail", "person", "address"]),
    });
    if (start_time != null) params.set("start_time", String(start_time));
    if (end_time != null) params.set("end_time", String(end_time));
    if (config.synology.fotoTeam) params.set("space", "team");
    const url = `http://${this.ip}/photo/webapi/entry.cgi?${params.toString()}&_sid=${sid}`;
    const data = await fetchJson(url, {
      timeoutMs: config.http.timeoutMs,
      retries: config.http.retries,
    });
    if (!data?.success) throw new Error("listItems failed");
    return data?.data ?? { list: [], total: 0 };
  }

  #dayWindowEpochSeconds(year, month, day) {
    const start = Math.floor(
      new Date(year, month - 1, day, 0, 0, 0).getTime() / 1000
    );
    const end = Math.floor(
      new Date(year, month - 1, day, 23, 59, 59).getTime() / 1000
    );
    return { start, end };
  }

  /** Query only this month/day in each prior year (server-side filter + pagination). */
  async listByMonthDayViaRanges(sid, { month, day }) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearsBack = config.synology.yearsBack;
    const minYear = config.synology.minYear;
    const startYear =
      yearsBack > 0 ? Math.max(currentYear - yearsBack, minYear) : minYear;
    const results = [];
    for (let year = currentYear - 1; year >= startYear; year--) {
      const { start, end } = this.#dayWindowEpochSeconds(year, month, day);
      let offset = 0;
      const limit = 1000;
      while (true) {
        const { list = [], total = 0 } = await this.listItems({
          sid,
          offset,
          limit,
          start_time: start,
          end_time: end,
        });
        results.push(...list);
        offset += list.length;
        if (offset >= total || list.length === 0) break;
      }
    }
    return results;
  }

  getThumbnailUrl(sid, photo) {
    const {
      id,
      additional: {
        thumbnail: { cache_key },
      },
    } = photo;

    return `http://${this.ip}/synofoto/api/v2/p/Thumbnail/get?id=${photoUID(photo)}&type=unit&size=xl&cache_key=${cache_key}&_sid=${sid}`;
  }
}
