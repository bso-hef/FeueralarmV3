import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Informations, InformationService } from 'src/app/_services/information.service';
import { RestService } from 'src/app/_services/rest.service';

import * as moment from 'moment'

@Component({
  selector: 'app-information',
  templateUrl: './information.page.html',
  styleUrls: ['./information.page.scss'],
})
export class InformationPage{

public infos: Informations

  constructor(
    private rest: RestService,
    private modal: ModalController,
    private information: InformationService
  ) { }

  ngOnInit() {
    this.infos = this.information.getInformation()
    console.log(this.infos.date)
  }

  public async logout(){
    await this.modal.dismiss()
    this.rest.logout()
  }

  public getFormatedTime(time: Date, format: string){
    return moment(time).subtract(1, "hours").format(format)
  }

  async back(){
    await this.modal.dismiss(null, null, "information")
  }

}
