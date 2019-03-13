import { TestBed } from '@angular/core/testing'
import { CookieService } from 'ngx-cookie-service';
import { EditDocumentService } from './edit-document.service'

describe('EditDocumentService', () => {
  beforeEach(() => TestBed.configureTestingModule({}))

  beforeEach(() => {  
    TestBed.configureTestingModule({
      providers: [
        EditDocumentService, CookieService
      ]
    });
  });

  it('should be created', () => {
    const service: EditDocumentService = TestBed.get(EditDocumentService)
    expect(service).toBeTruthy()
  })
})
