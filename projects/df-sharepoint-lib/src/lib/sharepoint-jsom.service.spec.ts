import { TestBed, inject } from '@angular/core/testing'
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import { SharepointJsomService } from './sharepoint-jsom.service'
import {NgZone } from '@angular/core'

describe('SharepointJsomService', () => {
  let service;
  let httpMock;
  let zone;
  beforeEach(() => {  
    TestBed.configureTestingModule({
      imports: [ HttpClientTestingModule ],
      providers: [
        SharepointJsomService
      ]
    });
  });

  beforeEach(  
    inject([SharepointJsomService, HttpTestingController, NgZone], (_service, _httpMock, _zone) => {
      service = _service;
      httpMock = _httpMock;
      zone = _zone;
    }));

  it('should be created', () => {
    expect(service).toBeTruthy()
  })
})
