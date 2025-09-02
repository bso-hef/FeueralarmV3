import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { RestService } from 'src/app/_services/rest.service';
import { SettingsService } from 'src/app/_services/settings.service'

import * as moment from 'moment'
import { SocketService } from 'src/app/_services/socket.service';
import { Subscription } from 'rxjs';
import { Archive } from '../../_interfaces/archive';

@Component({
  selector: 'app-information',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  public sortby: string
  private sub: Subscription
  public archives: Archive[] = []
  public toastBool: boolean
  public chosenArchive: string
  private chosenArchiveDate: Date
  public status: string

  constructor(
    private rest: RestService,
    private modal: ModalController,
    private settings: SettingsService,
    private io: SocketService
  ) { }


  ngOnInit() {
    moment.locale("de-DE");
    this.io.fetchAlerts()
    this.sub = this.io.archive.subscribe((archive: Archive[])=>{
      if(archive){
        this.archives = archive.slice().reverse()
        if(this.settings.getChosenArchive() == undefined){
          archive.forEach(element => {
            if (! element.archived) {
              this.chosenArchive = element._id
              this.settings.setLiveArchive(element._id)
              this.chosenArchiveDate = element.created
              this.settings.setChosenArchive(this.chosenArchive)
              return
            }
          })
        } else {
          this.chosenArchive = this.settings.getChosenArchive()
          archive.forEach(element => {
            if (! element.archived) {
              this.chosenArchiveDate = element.created
            }
          })
        }
      }
    this.sortby = this.settings.getSortby()
    this.status = this.settings.getStatus().toString()
    if (this.settings.getToast() == "true"){
      this.toastBool = true
    } else {
      this.toastBool = false
    }
    })
  }

  ngOnDestroy(){
    this.sub.unsubscribe()
  }

  public async logout(){
    await this.modal.dismiss()
    this.rest.logout()
  }

  public async onSortbyChange(event){
    this.settings.setSortby(event.target.value)
  }

  public async onStatusChange(event){
    this.settings.setStatus(event.target.value)
  }

  public onToastChange(event) {
    // console.log(this.toastBool)
    if (this.toastBool == false) {
      this.settings.setToast("false")
    } else {
      this.settings.setToast("true")
    }
  }

  public onChosenArchiveChange(event) {
    this.settings.setChosenArchive(event.target.value)
    this.chosenArchive = this.settings.getChosenArchive()
  }

  public formatDate(date: Date){
    if (date == this.chosenArchiveDate) {
      return moment(date).subtract(1, "hours").format("LLL") + " (aktuell)"
    }
    return moment(date).subtract(1, "hours").format("LLL")
  }

  async back(){
    await this.modal.dismiss(null, null, "settings")
  }

}
