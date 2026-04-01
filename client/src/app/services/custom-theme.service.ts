import { Injectable } from '@angular/core';
import tinycolor from 'tinycolor2';

interface Color {
  name: string;
  hex: string;
  darkContrast: boolean;
}

// https://bitperplexed.medium.com/dynamically-change-angular-material-theme-colors-292ebde0a42a
@Injectable({ providedIn: 'root' })
export class ThemeService {
  updateTheme(primaryColor: string = "3f51b5", accentColor: string = "ff4081", fontName: string = "Roboto") {
    //console.log(`updating theme to #${primaryColor} and #${accentColor}`);
    const tinyPrimaryColor = tinycolor(primaryColor);
    const tinyAccentColor = tinycolor(accentColor);
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const customThemePalette: Color[] = darkMode ?
    [
      this.getColorObject(tinyPrimaryColor.clone().lighten(10), '50'),
      this.getColorObject(tinyPrimaryColor.clone().lighten(5), '100'),
      this.getColorObject(tinyPrimaryColor.clone(), '200'),
      this.getColorObject(tinyPrimaryColor.clone().darken(5), '300'),
      this.getColorObject(tinyPrimaryColor.clone().darken(10), '400'),
      this.getColorObject(tinyPrimaryColor.clone().darken(15), '500'),
      this.getColorObject(tinyPrimaryColor.clone().darken(20), '600'),
      this.getColorObject(tinyPrimaryColor.clone().darken(30), '700'),
      this.getColorObject(tinyPrimaryColor.clone().darken(40), '800'),
      this.getColorObject(tinyPrimaryColor.clone().darken(50), '900'),
      this.getColorObject(tinyAccentColor.clone().lighten(60), 'A100'),
      this.getColorObject(tinyAccentColor.clone().lighten(40), 'A200'),
      this.getColorObject(tinyAccentColor.clone().lighten(20), 'A400'),
      this.getColorObject(tinyAccentColor.clone(), 'A700'),
    ] :
    [
      this.getColorObject(tinyPrimaryColor.clone().lighten(52), '50'),
      this.getColorObject(tinyPrimaryColor.clone().lighten(37), '100'),
      this.getColorObject(tinyPrimaryColor.clone().lighten(26), '200'),
      this.getColorObject(tinyPrimaryColor.clone().lighten(12), '300'),
      this.getColorObject(tinyPrimaryColor.clone().lighten(6), '400'),
      this.getColorObject(tinyPrimaryColor.clone(), '500'),
      this.getColorObject(tinyPrimaryColor.clone().darken(6), '600'),
      this.getColorObject(tinyPrimaryColor.clone().darken(12), '700'),
      this.getColorObject(tinyPrimaryColor.clone().darken(18), '800'),
      this.getColorObject(tinyPrimaryColor.clone().darken(24), '900'),
      this.getColorObject(tinyAccentColor.clone().lighten(50), 'A100'),
      this.getColorObject(tinyAccentColor.clone(), 'A200'),
      this.getColorObject(tinyAccentColor.clone().darken(20), 'A400'),
      this.getColorObject(tinyAccentColor.clone().darken(50), 'A700'),
    ];

    customThemePalette.forEach((color) => {
      document.documentElement.style.setProperty(
        `--custom-theme-palette-${color.name}`,
        color.hex
      );
      document.documentElement.style.setProperty(
        `--custom-theme-palette-contrast-${color.name}`,
        color.darkContrast ? 'rgba(0, 0, 0, 0.87)' : 'white'
      );
    });

    /*
    const primaryHsl = tinyPrimaryColor.toHsl();
    const bg = tinycolor({
      h: primaryHsl.h,
      s: darkMode ? primaryHsl.s * 0.5 : primaryHsl.s * 0.3,
      l: primaryHsl ? 0.2 : 0.95,
    }).toHexString();
    const fg = tinycolor.mostReadable(bg, ['#000', '#fff']).toHexString();
    document.documentElement.style.setProperty('--card-bg', bg);
    document.documentElement.style.setProperty('--card-fg', fg);
    */
   
    /*
    const neutral = tinycolor(darkMode ? '#1e1e1e' : '#ffffff');
    const bg = tinycolor.mix(neutral, primaryColor, darkMode ? 10 : 5).toHexString();
    const fg = tinycolor.mostReadable(bg, ['#000', '#fff']).toHexString();
    document.documentElement.style.setProperty('--card-bg', bg);
    document.documentElement.style.setProperty('--card-fg', fg);
    */

    const bg = darkMode ? '#1e1e1e' : '#ffffff';
    const fg = darkMode ? '#ffffff' : '#000000';
    document.documentElement.style.setProperty('--card-bg', bg);
    document.documentElement.style.setProperty('--card-fg', fg);

    // apply custom font
    if (fontName) {
      const fontName2 = fontName.replace(" ", "+");
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${fontName2}&display=swap`;
      document.head.appendChild(link);
      document.documentElement.style.setProperty("--custom-font", `"${fontName}"`);
    } else {
      document.documentElement.style.setProperty("--custom-font", `inherit`);
    }
  }

  private getColorObject(value: tinycolor.Instance, name: string): Color {
    const c = tinycolor(value);
    return {
      name: name,
      hex: c.toHexString(),
      darkContrast: c.isLight(), // determine if the contrast for this color should be black or white
    };
  }
}