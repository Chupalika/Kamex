import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatMomentDateModule, MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DateAdapter, MAT_DATE_LOCALE } from "@angular/material/core";
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TranslocoService } from '@jsverse/transloco';
import { MarkdownModule } from 'ngx-markdown';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavBarModule } from './nav_bar/nav_bar';
import { TranslocoRootModule } from './transloco-root.module';

export function initTransloco(transloco: TranslocoService) {
  return async () => {
    const savedLanguage = localStorage.getItem("language") ?? "en";
    transloco.setActiveLang(savedLanguage);
    await transloco.load(transloco.getActiveLang()).toPromise();
  };
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    HttpClientModule,
    MatDatepickerModule,
    MatDialogModule,
    MatMenuModule,
    MatMomentDateModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    NavBarModule,
    MarkdownModule.forRoot(),
    TranslocoRootModule,
  ],
  providers: [
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
    { provide: MAT_DATE_LOCALE, useValue: 'ja-JP' },
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS] },
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: '+0' } },
    { provide: APP_INITIALIZER, useFactory: initTransloco, deps: [TranslocoService], multi: true },
    provideAnimationsAsync(),
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(private matIconRegistry: MatIconRegistry, private sanitizer: DomSanitizer) {
    this.matIconRegistry.addSvgIcon("osu", this.sanitizer.bypassSecurityTrustResourceUrl("/assets/default/osu.svg"));
    this.matIconRegistry.addSvgIcon("taiko", this.sanitizer.bypassSecurityTrustResourceUrl("/assets/default/taiko.svg"));
    this.matIconRegistry.addSvgIcon("fruits", this.sanitizer.bypassSecurityTrustResourceUrl("/assets/default/fruits.svg"));
    this.matIconRegistry.addSvgIcon("mania", this.sanitizer.bypassSecurityTrustResourceUrl("/assets/default/mania.svg"));
    this.matIconRegistry.addSvgIcon("discord", this.sanitizer.bypassSecurityTrustResourceUrl("/assets/default/discord.svg"));
    this.matIconRegistry.addSvgIcon("timezone", this.sanitizer.bypassSecurityTrustResourceUrl("/assets/default/timezone.svg"));
    this.matIconRegistry.addSvgIcon("osu_logo", this.sanitizer.bypassSecurityTrustResourceUrl("/assets/default/osu_logo.svg"));
  }
}
