import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Page } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  apiUrl = environment.apiUrl + '/api/content';

  constructor(private http: HttpClient) {}

  getPage(name: string): Observable<Page> {
    return this.http.get(`${this.apiUrl}/${name}`, { withCredentials: true }) as Observable<Page>;
  }
}