import { TestBed, async, inject } from '@angular/core/testing'
import { HttpClientModule, HttpClient, HttpHeaders, HttpParams, HttpResponse, HttpRequest } from '@angular/common/http'
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { SharePointRestApiService } from './sharepoint-rest.service'
import * as _Window from "jsdom/lib/jsdom/browser/Window"

describe('SharePointRestApiService', () => {
  let service;
  let httpMock;
  let http;
  //const open = jest.fn()
  //Object.defineProperty(window, 'open', open);
  window['_spPageContextInfo'] = { loginUserName: 'test' };
  let ctx = { loginUserName: 'test' }
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule, HttpClientTestingModule],
      providers: [
        SharePointRestApiService
      ]
    });
  });

  beforeEach(
    inject([SharePointRestApiService, HttpTestingController, HttpClient], (_service, _httpMock, _http) => {
      service = _service;
      httpMock = _httpMock;
      http = _http;
    }));

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  })

  it(`should send an expected login request`, async(inject([SharePointRestApiService, HttpTestingController],
    (service: SharePointRestApiService, backend: HttpTestingController) => {
      service.getCurrentUser().subscribe(resp => {
        expect((resp as any)['data']).toEqual(testUser);
        expect((resp.data.d.LoginName as any)).toEqual('Test User');
      }
      );

      const testUser = {
        "d": {
          "LoginName": "Test User",
          "Title": "Mr",
          "Email": "test.user@company.com"
        }
      };

      const req = httpMock.expectOne(`${service.setBaseUrl('test')}/_api/web/currentuser?$expand=Groups`);
      expect(req.request.method).toBe("GET");
      req.flush({ data: testUser });
    })));

})
