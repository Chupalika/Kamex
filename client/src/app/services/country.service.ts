import { Injectable } from '@angular/core';
import * as countries from 'i18n-iso-countries';

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  constructor() {
    countries.registerLocale(require("i18n-iso-countries/langs/en.json"));
  }

  getCountryList(): { code: string; name: string }[] {
    return Object.entries(countries.getNames("en", { select: "official" })).map(([code, name]) => ({ code, name }));
  }

  getCountryMap(): Map<string, string> {
    return new Map(Object.entries(countries.getNames("en", { select: "official" })));
  }
}