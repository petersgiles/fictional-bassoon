import { NgModule } from '@angular/core'
import { EditDocumentService } from './edit-document.service'
import { SharepointJsomService } from './sharepoint-jsom.service'
import { SharepointListService } from './sharepoint-list.service'
import { SharePointRestApiService } from './sharepoint-rest.service'


@NgModule({
  declarations: [],
  providers: [EditDocumentService, SharepointJsomService, SharepointListService, SharePointRestApiService]
})
export class DfSharepointLibModule { }
