import { Injectable, NgZone } from '@angular/core'
import { Observable, of, from } from 'rxjs'
import * as X2JS from 'x2js'

import { HttpClient } from '@angular/common/http'
import { tap, map, concatMap } from 'rxjs/operators'


declare var SP: any
declare var _spPageContextInfo: any

const executeQueryAsyncPromise = (context) => new Promise((resolve, reject) => {
  if (!context) {
    context = SP.ClientContext.get_current()
  }

  context.executeQueryAsync(resolve, (_, args) => reject(args.get_message()))
})

const executeQueryAsObservable = (context) => from(executeQueryAsyncPromise(context))

const fieldMap = {
  LinkTitle: 'Title',
  LinkFilename: 'FileLeafRef'
}

const skipTheseAtrocities = {
  DocIcon: true
}

@Injectable({
  providedIn: 'root'
})
export class SharepointJsomService {

  x2js: X2JS

  log(...message: any[]) {
    // tslint:disable-next-line:no-console
    console.log(message)
  }

  /// USER

  public getUserById(): Observable<any> {
    const ref: any = document.getElementById('__REQUESTDIGEST')
    const requestDigest = ref.value
    const uri = `${_spPageContextInfo.webAbsoluteUrl}/_api/web/GetUserById('${_spPageContextInfo.userId}')?$expand=Groups`

    return this.http.get(uri, {
      headers: {
        'accept': 'application/json;odata=verbose',
        'X-RequestDigest': requestDigest
      }
    })
      .pipe(
        tap((response: any) => this.log(response)),
        map((response: any) => ({ ...response.d, is_current_user: true }))
      )
  }

  getCurrentUser(): Observable<SPAppUserProfile> {

    const context = SP.ClientContext.get_current()
    const web = context.get_web()
    const user = web.get_currentUser() // must load this to access info.
    context.load(user)

    const currentInfo = {
      userid: _spPageContextInfo.userId,
      login: _spPageContextInfo.userLoginName,
      isSiteAdmin: _spPageContextInfo.isSiteAdmin,
      systemUserKey: _spPageContextInfo.systemUserKey
    }

         // tslint:disable-next-line:no-console
         console.log('cheese')

    return executeQueryAsObservable(context)
      .pipe(
        concatMap(_userresponse => {
          const groups = user.get_groups()
          context.load(groups)
          return executeQueryAsObservable(context)
          .pipe(
            concatMap(_groupresponse => {
            const groupArray = []
            const groupEnumerator = groups.getEnumerator()
              while (groupEnumerator.moveNext()) {
                  groupArray.push(groupEnumerator.get_current().get_title())
              }
              // tslint:disable-next-line:no-console
              console.log(groupArray)

              return of({
                ...currentInfo,
                name: user.get_title(),
                roles: [...groupArray]
              })
          })
      )}
      )
      )
  }

  getSharePointUserProfile(): Observable<any> {
    const context = SP.ClientContext.get_current()
    const peopleManager = new SP.UserProfiles.PeopleManager(context)
    const personProperties = peopleManager.getMyProperties()
    context.load(personProperties)

    return executeQueryAsObservable(context)
      .pipe(
        map(_ => personProperties.get_userProfileProperties())
      )
  }

  /// FOLDER

  createFolder(listName: string, folderName: string, context?: any): Observable<any> {

    context = context || SP.ClientContext.get_current()
    const list = context.get_web().get_lists().getByTitle(listName)
    context.load(list)

    const folderCreateInfo = new SP.ListItemCreationInformation()
    folderCreateInfo.set_underlyingObjectType(SP.FileSystemObjectType.folder)
    folderCreateInfo.set_leafName(folderName)

    const item = list.addItem(folderCreateInfo)
    item.set_item('ContentTypeId', '0x0120')
    item.set_item('Title', folderName)
    item.update()

    context.load(item)

    return executeQueryAsObservable(context)
  }

  /// LISTS

  getLists(): Observable<any> {
    const context = SP.ClientContext.get_current()
    const lists = context.get_web().get_lists()

    context.load(lists, 'Include(Title, Id, BaseType)')
    return executeQueryAsObservable(context)
      .pipe(
        map(_ => {
          const listEnumerator = lists.getEnumerator()

          const listList = []
          while (listEnumerator.moveNext()) {
            const current = listEnumerator.get_current()

            const baseTypes = ['GenericList', 'DocumentLibrary', 'Unknown', 'DiscussionBoard', 'Survey', 'Issue']

            listList.push({
              title: current.get_title(),
              id: current.get_id().toString(),
              baseType: baseTypes[current.get_baseType()],
            })
          }
          return listList
        }))
  }

  getListFields(listTitle: any): Observable<any> {
    const context = SP.ClientContext.get_current()
    const list = context.get_web().get_lists().getByTitle(listTitle)
    const fields = list.get_fields()

    return executeQueryAsObservable(context)
      .pipe(
        map(_ => {
          const e = fields.getEnumerator()
          const fieldHash = {}
          while (e.moveNext()) {
            const current = e.get_current()
            fieldHash[current.get_internalName()] = {
              Field: current,
              Type: current.get_typeAsString()
            }
          }
          return fieldHash
        })
      )
  }

  /// LIST ITEMS

  addItem(listName: string, data: any): Observable<any> {
    const context = SP.ClientContext.get_current()
    const list = context.get_web().get_lists().getByTitle(listName)
    const listItemCreation = new SP.ListItemCreationInformation()
    const item = list.addItem(listItemCreation)

    for (const prop of Object.keys(data)) {
      item.set_item(prop, data[prop])
    }

    item.update()

    return executeQueryAsObservable(context)
  }

  getItems(config: { listName: string, viewXml?: string, viewFields?: string[], top?: number }): Observable<any> {

    if (config.top) {
      // we want more rows than default view
      const viewJson: any = this.x2js.xml2js(config.viewXml)
      viewJson.View.RowLimit = {
        _Paged: 'TRUE',
        __text: '' + top
      }
      config.viewXml = this.x2js.js2xml(viewJson)

    }

    return this.getListItems(config.listName, config.viewXml)
      .pipe(
        map(items => {
          let result: any
          if (items.getEnumerator) {
            result = []
            const e = items.getEnumerator()
            if (config.viewFields) {

              if (config.viewFields.indexOf('ID') < 0) {
                config.viewFields.push('ID')
              }

              while (e.moveNext()) {
                const item = e.get_current()
                const itemObject = config.viewFields.reduce((acc, fieldName) => {

                  if (skipTheseAtrocities[fieldName]) { return acc }

                  const mappedName = fieldMap[fieldName] ? fieldMap[fieldName] : fieldName

                  acc[mappedName] = item.get_item(mappedName)
                  return acc

                }, {})

                result.push(itemObject)
              }
            } else {
              while (e.moveNext()) {
                result.push(e.get_current().get_fieldValues())
              }
            }
          } else {
            result = items
          }
          return result
        })
      )
  }

  getPrettyItems(listName: string, viewXml: any, viewFields: any): Observable<any> {
    const context = SP.ClientContext.get_current()
    const fields = context.get_web().get_lists().getByTitle(listName).get_fields()
    context.load(fields)

    return executeQueryAsObservable(context)
      .pipe(
        concatMap(_ => {
          const fieldTitleMap = {}
          const e = fields.getEnumerator()
          while (e.moveNext()) {
            const field = e.get_current()
            fieldTitleMap[field.get_internalName()] = field.get_title()
          }

          return this.getItems(
            {
              listName: listName,
              viewXml: viewXml,
              viewFields: viewFields,
              top: 5000
            }
          ).pipe(
            map((items) => {
              const prettyItems = items.map((item) => {

                const prettyItem = {}
                for (const key of Object.keys(item)) {
                  const value = item[key]
                  const fieldTitle = fieldTitleMap[key]
                  prettyItem[key] = { title: fieldTitle, value: value }
                }
                return prettyItem
              })

              return prettyItems
            })
          )
        })
      )
  }

  getListItems(listName, viewXml, attributesToLoad?): Observable<any> {
    const query = new SP.CamlQuery()
    query.set_viewXml(viewXml)

    const context = SP.ClientContext.get_current()
    const items = context.get_web().get_lists().getByTitle(listName).getItems(query)

    if (attributesToLoad) {
      const include = `Include('${attributesToLoad.join(',')}')`
      context.load(items, include)
    } else {
      context.load(items)
    }

    return executeQueryAsObservable(context)
      .pipe(
        map(_ => items)
      )
  }

  getAll(listName): Observable<any[]> {
    const query = `<View Scope="RecursiveAll">
    <RowLimit>5000</RowLimit>
    <Query>
    <Where>
    <Neq><FieldRef Name='FSObjType'/><Value Type='Integer'>1</Value></Neq>
    </Where>
    </Query>
    </View>`

    return this.getItems({
      listName: listName,
      viewXml: query,
      top: 5000
    })
  }

  storeItem(config: { listName: string, data: any, folderName?: string, id?: string | number }): Observable<any> {
    if (config.id) {
      return this.refreshItem(config.listName, config.id)
        .pipe(
          concatMap((response) => this.updateItem(response.Context, response.Item, config.data))
        )
    } else {
      const context = SP.ClientContext.get_current()
      const list = context.get_web().get_lists().getByTitle(config.listName)

      if (!config.folderName) {

        const listItemCreation = new SP.ListItemCreationInformation()
        const item = list.addItem(listItemCreation)
        return this.updateItem(context, item, config.data)

      } else {

        const folders = list.get_rootFolder().get_folders()
        context.load(folders)

        return executeQueryAsObservable(context)
          .pipe(
            concatMap(_ => {

              const folderList = []
              const e = folders.getEnumerator()
              while (e.moveNext()) {
                const current = e.get_current()
                folderList.push(current)
              }

              const folder = folderList.find(f => f.get_name() === config.folderName)
              if (folder) {
                const listItemCreation = new SP.ListItemCreationInformation()
                const item = folder.addItem(listItemCreation)
                return this.updateItem(context, item, config.data)
              }
            })
          )
      }
    }
  }

  refresh(context, item): Observable<any> {
    context.load(item)
    return executeQueryAsObservable(context)
      .pipe(
        map(_ => item)
      )
  }

  refreshItem(listName: string, itemId: string | number): Observable<any> {
    const context = SP.ClientContext.get_current()
    const list = context.get_web().get_lists().getByTitle(listName)
    const item = list.getItemById(itemId)
    context.load(item)

    return executeQueryAsObservable(context)
      .pipe(
        map(_ => ({ Context: context, Item: item }))
      )
  }

  updateItem(context, item, data): Observable<any> {

    this.updateItemProperties(item, data)
    context.load(item)

    return executeQueryAsObservable(context)
      .pipe(
        map((response) => item.get_fieldValues())
      )
  }

  updateItemProperties(item: any, data: any): any {

    for (const prop of Object.keys(data)) {
      item.set_item(prop, data[prop])
    }

    item.update()
  }

  removeItem(config: { listName: string, id: string }): Observable<any> {

    let item

    const context = SP.ClientContext.get_current()
    const list = context.get_web().get_lists().getByTitle(config.listName)

    if (config.id) {
      item = list.getItemById(config.id)
    }
    if (item) {
      item.recycle()
    }

    return executeQueryAsObservable(context)
  }

  getListItemFromFileUrl(serverRelativeUrl, getTextValues): Observable<any> {
    const context = SP.ClientContext.get_current()
    const listItem = context.get_web().getFileByServerRelativeUrl(serverRelativeUrl).get_listItemAllFields()
    const fieldValues = getTextValues ? listItem.get_fieldValuesAsText() : listItem.get_fieldValuesAsHtml()
    context.load(fieldValues)

    return executeQueryAsObservable(context)
      .pipe(
        map(_ => fieldValues.get_fieldValues())
      )
  }

  /// FOLDER

  getFolder(listName, folderName): Observable<any[]> {
    const query = `<View Scope="RecursiveAll">
    <Query>
    <Where>
      <And>
        <BeginsWith>
            <FieldRef Name='ContentType' />
            <Value Type='Computed'>Folder</Value>
        </BeginsWith>
        <BeginsWith>
            <FieldRef Name='Title' />
            <Value Type='Text'>${folderName}</Value>
        </BeginsWith>
      </And>
    </Where>
    </Query>
    </View>`
    return this.getItems({
      listName: listName,
      viewXml: query,
      top: 5000
    })
  }

  getFolderPath(listName: string, folderName: string) {
    return `${_spPageContextInfo.webAbsoluteUrl}/Lists/${listName}/${folderName}`
  }

  storeItemInFolder(listName: string, folderName: string, data: any, id?: string | number): Observable<any> {
    const self = this
    // need to specify full path after site domain , ex:
    // "/sites/DMS/Lists/Custom/Folder"
    const folderPath = this.getFolderPath(listName, folderName)

    if (id) {
      return self.refreshItem(listName, id)
        .pipe(
          map((response) =>
            self.updateItem(response.Context, response.Item, data)
          )
        )
    } else {

      const context = SP.ClientContext.get_current()
      const list = context.get_web().get_lists().getByTitle(listName)

      const listItemCreation = new SP.ListItemCreationInformation()
      listItemCreation.set_folderUrl(folderPath)
      const item = list.addItem(listItemCreation)
      this.updateItemProperties(item, data)
      context.load(item)

      return executeQueryAsObservable(context)
        .pipe(
          map(_ => item.get_fieldValues())
        )
    }
  }

  /// WEB

  getWebUrl() {
    return of(_spPageContextInfo.webAbsoluteUrl)
  }

  getWebRelativeUrl() {
    return of(`${_spPageContextInfo.webServerRelativeUrl.replace(/\/$/, '')}`)
  }

  getFromWeb(webRelativeUrl) {
    const uri = `${_spPageContextInfo.webAbsoluteUrl}/${webRelativeUrl}`
    return this.http.get(uri, {
      responseType: 'text',
      headers: {
        'accept': 'application/json;odata=verbose'
      }
    })
  }

  getDefaultView(listName) {
    const context = SP.ClientContext.get_current()
    const list = context.get_web().get_lists().getByTitle(listName)
    const view = list.get_defaultView()
    context.load(view)
    context.load(view.get_viewFields())
    return executeQueryAsObservable(context)
      .pipe(
        map(_ => view)
      )
  }

  getDefaultFormsByListTitle(listTitle) {
    const context = SP.ClientContext.get_current()
    const list = context.get_web().get_lists().getByTitle(listTitle)

    context.load(list, 'DefaultEditFormUrl', 'DefaultNewFormUrl', 'DefaultDisplayFormUrl')

    return executeQueryAsObservable(context)
      .pipe(
        map(_ => ({
          Edit: list.get_defaultEditFormUrl(),
          Display: list.get_defaultDisplayFormUrl(),
          New: list.get_defaultNewFormUrl()
        })
        )
      )
  }

  getChoices(config: { listName: string, fieldName: string }) {
    const context = SP.ClientContext.get_current()
    const field = context.get_web().get_lists().getByTitle(config.listName)
      .get_fields().getByInternalNameOrTitle(config.fieldName)
    context.load(field)

    return executeQueryAsObservable(context)
      .pipe(
        map(_ => {
          const choiceField = field.get_typedObject()
          return {
            DefaultValue: choiceField.get_defaultValue(),
            Choices: choiceField.get_choices()
          }
        })
      )
  }

  getDefaultTemplateUrl(listTitle) {
    const context = SP.ClientContext.get_current()
    const list = context.get_web().get_lists().getByTitle(listTitle)
    context.load(list, 'DocumentTemplateUrl')

    return executeQueryAsObservable(context)
      .pipe(
        map(_ => list.get_documentTemplateUrl()),
        map((templateUrl: string) =>
          this.http.get(templateUrl, { responseType: 'arraybuffer' })
            .pipe(
              map((result: any) => ({
                name: templateUrl.split('/').reverse()[0],
                Buffer: result.data
              }))
            )
        )
      )
  }

  fileUploader(config: { list: any, file: any, fileName?: string }): Observable<any> {
    if (!config.fileName) {
      config.fileName = this.guidFileName(config.file.name)
    }
    // Need to use REST for files over 2MB
    const url = `${_spPageContextInfo.webAbsoluteUrl}/_api/Web/Lists/getByTitle('${config.list}')/rootfolder/files/add(overwrite=true, url='${config.fileName}')`

    return of([])
  }

  guidFileName(filename) {

    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1)
    }

    const extension = filename.split('.').reverse()[0].toLowerCase()

    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}.${extension}`
  }

  constructor(private _ngZone: NgZone, private http: HttpClient) {
    this.x2js = new X2JS()
  }
}

export interface SPAppUserProfile {
  name: string
  roles?: any,
  email?: string
  background?: string
  displayType?: string
  size?: number
}
