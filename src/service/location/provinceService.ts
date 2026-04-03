import { districtService } from "@/service/location/districtService";

export interface Province {
  id: string;
  name: string;
}

/** Same as FE: provinces derived from unique district.provinceName */
export const provinceService = {
  async getAllProvinces(): Promise<Province[]> {
    try {
      const districts = await districtService.getAllDistricts();
      const seen = new Set<string>();
      const provinces: Province[] = [];
      for (const d of districts) {
        if (d.provinceName && !seen.has(d.provinceName)) {
          seen.add(d.provinceName);
          provinces.push({ id: d.provinceName, name: d.provinceName });
        }
      }
      return provinces.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    } catch {
      return [];
    }
  },
};
