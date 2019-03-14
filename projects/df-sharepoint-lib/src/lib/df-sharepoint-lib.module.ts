import { NgModule, ModuleWithProviders } from '@angular/core'
import { EditDocumentService } from './edit-document.service'
import { SharepointJsomService } from './sharepoint-jsom.service'
import { SharepointListService } from './sharepoint-list.service'
import { SharePointRestApiService } from './sharepoint-rest.service'


@NgModule({
  
})
export class DfSharepointLibModule {
  static forRoot(): ModuleWithProviders {
      return {
        ngModule: DfSharepointLibModule,
        providers: [EditDocumentService, SharepointJsomService, SharepointListService, SharePointRestApiService],
      };
    }
}
