import { fetchJson } from "./http.js";
import { config } from "./config.js";
import { photoUID } from "./utils.js";

/** Synology client using list_with_filter and aggregated time ranges. */
export class SynologyClient {
  constructor({ ip, user, password, fotoSpace }) {
    this.ip = ip;
    this.user = user;
    this.password = password;
    this.fotoSpace = fotoSpace;
  }

  async authenticate() {
    const url = `https://${this.ip}/photo/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${encodeURIComponent(this.user)}&passwd=${encodeURIComponent(this.password)}`;
    const data = await fetchJson(url, {
      timeoutMs: config.http.timeoutMs,
      retries: config.http.retries,
      insecure: true,
    });
    if (!data?.data?.sid) throw new Error("Auth failed");
    return data.data.sid;
  }

  async logout(sid) {
    try {
      const url = `https://${this.ip}/photo/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=logout&_sid=${sid}`;
      await fetchJson(url, {
        timeoutMs: config.http.timeoutMs,
        retries: config.http.retries,
        insecure: true,
      });
    } catch {}
  }

  async listItems({ sid, offset = 0, limit = 1000, time }) {
    const params = new URLSearchParams({
      api: "SYNO.Foto.Browse.SimilarItem",
      version: "1",
      method: "list_with_filter",
      item_type: [0], // 0 = photos
      offset: String(offset),
      limit: String(limit),
      additional: JSON.stringify(["thumbnail", "person", "address", "exif"]),
    });
    if (Array.isArray(time) && time.length > 0) {
      params.set("time", JSON.stringify(time));
    }
    if (config.synology.fotoTeam) params.set("space", "team");
    const url = `https://${this.ip}/photo/webapi/entry.cgi?${params.toString()}&_sid=${sid}`;

    const data = await fetchJson(url, {
      timeoutMs: config.http.timeoutMs,
      retries: config.http.retries,
      insecure: true,
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

  /** Query only this month/day in each prior year using a single filtered request (with pagination). */
  async listByMonthDayViaRanges(sid, { month, day }) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearsBack = config.synology.yearsBack;
    const minYear = config.synology.minYear;
    const startYear =
      yearsBack > 0 ? Math.max(currentYear - yearsBack, minYear) : minYear;
    // Build time ranges for each year into a single filter
    const time = [];
    for (let year = currentYear - 1; year >= startYear; year--) {
      const { start, end } = this.#dayWindowEpochSeconds(year, month, day);
      time.push({ start_time: start, end_time: end });
    }

    console.log(time);

    // Single aggregated query with pagination
    const results = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
      const { list = [], total = 0 } = await this.listItems({
        sid,
        offset,
        limit,
        time,
      });
      results.push(...list);
      offset += list.length;
      if (offset >= total || list.length === 0) break;
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

    return `https://${this.ip}/synofoto/api/v2/p/Thumbnail/get?id=${photoUID(photo)}&type=unit&size=xl&cache_key=${cache_key}&_sid=${sid}&verify=false`;
  }
}
