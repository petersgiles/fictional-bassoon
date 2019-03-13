import { Injectable } from '@angular/core'
import { CookieService } from 'ngx-cookie-service'

declare var SP: any
declare var _spPageContextInfo: any
declare var window: any

@Injectable({
  providedIn: 'root'
})
export class EditDocumentService {

  constructor(private cookieService: CookieService) { }

  public get sharepointContext() {
    return {
      relativeWebUrl: `${_spPageContextInfo.webServerRelativeUrl.replace(/\/$/, '')}`,
      webUrl: `${_spPageContextInfo.webAbsoluteUrl}`,
    }
  }

  public editWOPIDoc(fileLeafRef, list) {
    // edit document in browser
    const url = [
      this.sharepointContext.webUrl,
      '/_layouts/15/WopiFrame.aspx',
      '?sourcedoc=',
      this.sharepointContext.relativeWebUrl,
      '/',
      list,
      '/',
      fileLeafRef,
      '&action=edit'
    ].join('')

    // Set OWA cookie so that browser will redirect back here after closing OWA
    this.cookieService.set('WOPISessionContext', JSON.stringify({ path: '/' }))
    window.open(url, '_blank')
  }

  editDocRichClient(fileLeafRef, list) {

    // Office URI Schemes - Check the filetype to launch correct Rich Client
    // Ref: https://msdn.microsoft.com/en-us/library/office/dn906146.aspx
    // ms-word:ofe|u|https://igb.internal.pmc.gov.au/sites/IB/brief/xxx.docx
    const fileType = fileLeafRef.toLowerCase()
    let prefixLauncher = ''
    let targetLauncher = '_self'

    if (fileType.indexOf('.doc') > -1) {
      prefixLauncher = 'ms-word:ofe|u|'
    }
    else if (fileType.indexOf('.xls') > -1) {
      prefixLauncher = 'ms-excel:ofe|u|'
    }
    else if (fileType.indexOf('.ppt') > -1) {
      prefixLauncher = 'ms-powerpoint:ofe|u|'
    }
    else if (fileType.indexOf('.vsd') > -1) {
      prefixLauncher = 'ms-visio:ofe|u|'
    }
    else {
      // Catch all other file types
      targetLauncher = '_blank'
    }

    // edit document in rich client
    const urlRichClient = [
      prefixLauncher,
      this.sharepointContext.webUrl,
      '/',
      list,
      '/',
      fileLeafRef
    ].join('')

    window.open(urlRichClient, targetLauncher)
  }

}
