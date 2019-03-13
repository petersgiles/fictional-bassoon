import { TestBed } from '@angular/core/testing'

import { SharepointListService } from './sharepoint-list.service'

describe('SharepointListService', () => {
  beforeEach(() => TestBed.configureTestingModule({}))

  it('should be created', () => {
    const service: SharepointListService = TestBed.get(SharepointListService)
    expect(service).toBeTruthy()
  })
})
