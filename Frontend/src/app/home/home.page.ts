import { Component } from '@angular/core';
import { Teacher } from '../_interfaces/lehrer';
import { Time } from '../_interfaces/time';
import { Archive } from '../_interfaces/archive';
import { DataService } from '../_services/data.service';
import { AlertController, IonRouterOutlet, ModalController} from "@ionic/angular";
import { PickerOptions } from "@ionic/core";
import { element } from 'protractor';

import * as moment from 'moment'
import * as Rx from "rxjs";

import { RestService } from '../_services/rest.service';
import { FeedbackService } from '../_services/feedback.service';
import { InformationPage } from '../_modals/information/information.page';
import { SocketService } from '../_services/socket.service';
import { SettingsPage } from '../_modals/settings/settings.page';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import { SettingsService } from '../_services/settings.service'
import { type } from 'os';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

export class HomePage {

  public teachers: Teacher[] = []
  public times: Time
  public filter: Teacher[]
  public teachersSorted: Teacher[] = []

  private firstSortClass: string[] = []
  private firstSortTeacher: string[][] = []
  private indexSorted: number[] = []

  public selectedState: number
  private selectedValue: string = ""
  private searchValue: string = ""
  public role: string = ""
  public sortby: string = "teacher"
  private sortbyBool: boolean = true
  private commentOld: string
  private stateOld: number
  private ignoreToast: boolean = false
  private socketID: string

  private chosenArchive: string
  public archives: Archive[] = []
  private archiveSub: Rx.Subscription
  private postsSub: Rx.Subscription
  private updateSub: Rx.Subscription

  private observer: MutationObserver

  constructor(
    private data: DataService,
    private alertCtrl: AlertController,
    private rest: RestService,
    private feedback: FeedbackService,
    private modalCtrl: ModalController,
    private routerOutlet: IonRouterOutlet,
    private io: SocketService,
    private settings: SettingsService,
  ) {

  }

  async ngOnInit() {
    if (this.settings.getStatus() == null || parseInt(this.settings.getStatus()) == undefined) {
      this.settings.setStatus("1")
    }
    this.selectedState = parseInt(this.settings.getStatus())
    this.ignoreToast = true
    this.rest.getRole().subscribe((result: string)=>{
      this.role = result
    })
    this.setEmittedPosts()
    this.filter = this.teachers
    this.times = {
      time: this.getCurrentTime(), schoolHours:
        [["0745", "1"], ["0830", "2"], ["0930", "3"], ["1015", "4"],
        ["1115", "5"], ["1200", "6"], ["1315", "7"], ["1400", "8"]]
    }
    this.selectedValue = this.getCurrentTime()
    this.checkSchoolHour()
    this.getData()
    this.archiveSub = this.io.archive.subscribe((archive: Archive[])=>{
      if(archive){
        this.archives = archive
        if(this.settings.getChosenArchive() == undefined){
          archive.forEach(element => {
            if (! element.archived) {
              this.chosenArchive = element._id
              return
            }
          })
        } else{
          this.chosenArchive = this.settings.getChosenArchive()
        }
     }
    })
    await this.delay(1000)
    this.ignoreToast = false
    this.socketID = this.io.getSocketID()
  }

  ngOnDestroy(){
    this.archiveSub.unsubscribe()
    this.postsSub.unsubscribe()
    this.updateSub.unsubscribe()
  } 

  public segmentChanged(event) {
    this.selectedState = event.detail.value
    this.search(this.searchValue)
  }

  private setEmittedPosts(){
    this.postsSub = this.io.posts.subscribe((result: any)=>{
      if(result){
        this.teachers = this.data.getTeachersByJSON(result.posts)
        this.filter = this.teachers
        if (this.settings.getSortby() != "class" || this.settings.getSortby() != "teacher") {
          this.sortAlpabetical("teacher")  
        } else {
          this.sortAlpabetical(this.settings.getSortby())
        }
        if (this.settings.getToast() != "true" || this.settings.getToast() != "false") {
          this.settings.setToast("true") 
        }
      }
    })
    this.updateSub = this.io.update.subscribe((result: any)=>{
      if(result){
        let res: Teacher = this.teachers.find((teacher: Teacher)=>{
          return teacher.id === result._id
        })
          var stateString: string
          if(res){
            this.stateOld = res.state
            res.state = (result.status === "incomplete") ? 3 : (result.status === "complete") ? 2 : 1
            if (res.state == 2) {
              stateString = "Anwesend"
            } else {
              stateString = "Unvollständig"
            }
            res.comment = (result.comment === " ") ? "" : result.comment
          }
        this.search(this.searchValue)

        //Benachrichtigung
        if (! this.ignoreToast && this.settings.getLiveArchive() == this.settings.getChosenArchive()) {
          if (this.settings.getToast() == "true" && this.io.getSocketID() != this.io.getlastChangeSocketID()) {
            var firstPartToast: string
            if (this.sortby == "teacher") {
              firstPartToast = "Schulklasse von "
              res.names.forEach((element, index) => {
                if (index+2 == res.names.length) {
                  firstPartToast += element + " & "  
                } else if (index+1 == res.names.length) {
                  firstPartToast += element  
                } else {
                  firstPartToast += element + ", "   
                }
              })
            firstPartToast+= " (" + res.classNumber + ") wurde bearbeitet."
            } else {
              firstPartToast = "Schulklasse " + res.class + " wurde bearbeitet."  
              }
            if (this.stateOld != res.state) {
              this.feedback.showToast(firstPartToast + `\nStatus <ion-icon class="icon" name="arrow-forward"></ion-icon> ${stateString}.`)
            } else if (res.comment != "") {
              this.feedback.showToast(firstPartToast + `\nKommentar <ion-icon class="icon" name="arrow-forward"></ion-icon> ${res.comment}.`)
            } else {
              this.feedback.showToast(firstPartToast + `\nKommentar gelöscht.`)  
            }
          }
        }
      }
    })
  }

  public async getData() {
    await this.feedback.updateLoading("Lade Daten...")
    this.io.getPosts()

    await this.delay(2000)

    var i = 0
    while (i < 10 && ! this.io.getFetched()) {
      this.io.getPosts()  
      await this.delay(1200)
      i++
    }
  }

  public async deleteComment(teacher: Teacher) {
    teacher.comment = ""
    this.io.updateComment(teacher.id, " ")
  }

  public async setComment(teacher: Teacher): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Kommentar hinzufügen',
      inputs: [
        {
          name: 'comment',
          type: 'text',
        }
      ],
      buttons: ['OK']
    });
    alert.mode = "md";
    
    alert.onDidDismiss().then(result => {
      if (result.data && result.data.values.comment.trim() != "") {
      // console.log(result.data.values.comment)
        teacher.comment = result.data.values.comment.trim() 
        this.commentOld = teacher.comment
        this.io.updateComment(teacher.id, result.data.values.comment)
      }
    })
    await alert.present();
    const firstInput: any = document.querySelector('ion-alert input');
    firstInput.focus();
    firstInput.addEventListener("keyup", function(event) {
        if (event.key === "Enter") {
          const okButton: any = document.querySelectorAll('ion-alert button')[0];
          okButton.click();
        }
      })
  }

  public setPresent(teacher: Teacher): void{
    if (teacher.state != 2) {
      teacher.state = 2
      this.stateOld = teacher.state
      this.io.updatePost(teacher.id, "complete", "")
    }
  }

  public setLost(teacher: Teacher): void{
    if (teacher.state != 3) {
      teacher.state = 3
      this.stateOld = teacher.state
      this.io.updatePost(teacher.id, "incomplete","")
    }
  }

  public setSearchValue(event) :void{
    this.searchValue = event.srcElement.value;
    this.search(this.searchValue)
  }

  public getSearchValue(): string{
    return this.searchValue
  }

  public search(searchValue: string): void {
    if (this.searchValue == "" && this.selectedState == 4) {
      this.clearSearch();
      return;
    }
    let names_bool: boolean, class_bool: boolean, room_bool: boolean;
    this.filter = this.teachers.filter(term => {
      names_bool = false;
      class_bool = false;
      room_bool = false;

      for (let index = 0; index < term.names.length; index++) {
        if (term.names[index].toLowerCase().indexOf(this.searchValue.trim().toLowerCase()) > -1 &&
          (term.state == this.selectedState || this.selectedState == 4)) {
          names_bool = true;
        }
      }
        if (term.class.toLowerCase().indexOf(this.searchValue.trim().toLowerCase()) > -1 &&
          (term.state == this.selectedState || this.selectedState == 4)) {
          class_bool = true;
        }
      for (let index = 0; index < term.room.length; index++) {
        if (term.room[index].toLowerCase().indexOf(this.searchValue.trim().toLowerCase()) > -1 &&
          (term.state == this.selectedState || this.selectedState == 4)) {
          room_bool = true;
        }
      }
      return names_bool || class_bool || room_bool
    })
  }

  public async sortAlpabetical(sortby: string): Promise<void>{
    if (this.sortby != sortby || this.sortbyBool == true){
      console.log(sortby)
      this.settings.setSortby(sortby)
      this.sortby = sortby
      if (sortby == "class") {
        this.teachers.forEach(element => {
          this.firstSortClass.push(element.class + element.classNumber)
        });
        this.firstSortClass = this.firstSortClass.sort()
        this.firstSortClass.forEach(element => {
          for (let index = 0; index < this.teachers.length; index++) {
            var teacher = this.teachers[index];
            if (teacher.class + teacher.classNumber == element){
              this.indexSorted.push(index)
            }
          }
        });
        for (let index = 0; index < this.firstSortClass.length; index++) {
          this.teachersSorted.push(this.teachers[this.indexSorted[index]])
        }
      }
      else {
        this.teachers.forEach(element => {
          var result = element.names[0].split(" ")
          this.firstSortTeacher.push([result[result.length-1], element.id])
        });
        // console.log(this.firstSortTeacher)
        this.firstSortTeacher = this.firstSortTeacher.sort()
        this.firstSortTeacher.forEach(element => {
          this.teachers.forEach((teacher, index) => {
            if (teacher.id== element[1]){
              this.indexSorted.push(index)
            }
          })})
        for (let index = 0; index < this.firstSortTeacher.length; index++) {
          this.teachersSorted.push(this.teachers[this.indexSorted[index]]) 
        }
      }
      this.filter = this.teachersSorted
      this.teachers = this.teachersSorted
      this.teachersSorted = []
      this.indexSorted = []
      this.firstSortTeacher = []
      this.firstSortClass = []
      this.search(this.getSearchValue())
    }
  }

  public clearSearch(): void {
    this.filter = this.teachers
  }

  public onSelectValueChange(event): void {
    this.selectedValue = event.target.value
  }

  public async fireAlert(): Promise<void> {
    await this.feedback.updateLoading("Feueralarm wird ausgelöst...")
    this.io.alert(this.selectedValue, moment(new Date).format("yyyyMMDD"))
  }

  public getCurrentTime(): string {
    const date = new Date()
    const hours_0 = date.getHours() < 10 ? '0' : ''
    const minutes_0 = date.getMinutes() < 10 ? '0' : ''

    const time = hours_0 + date.getHours().toString() + minutes_0 + date.getMinutes().toString()
    return time;
  }

  public checkSchoolHour() {
    let index_: number = 0
    for (let index = 0; index < this.times.schoolHours.length; index++) {
      if (Number(this.times.time) >= Number(this.times.schoolHours[index][0])) {
        index_ = index
      }
      else { break; } {
        this.times.currentSchoolHour = this.times.schoolHours[index_][0]
      }
    }
  }

  public async openInformation(){
    let modal = await this.modalCtrl.create({
      component: InformationPage,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl,
      mode: "ios",
      id: "information",
      cssClass: 'custom-modal'
    })
    await modal.present()
  }

  public async openSettings(){
    let modal = await this.modalCtrl.create({
      component: SettingsPage,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl,
      mode: "ios",
      id: "settings",
      cssClass: 'custom-modal'
    })
    await modal.present()
    await modal.onWillDismiss()
    this.sortAlpabetical(this.settings.getSortby());
    var chosenArchiveNew = this.settings.getChosenArchive()
    if (this.chosenArchive != chosenArchiveNew){
      await this.feedback.updateLoading("Lade Daten...")
      this.io.getPosts(chosenArchiveNew)
      this.chosenArchive = chosenArchiveNew
    }
  }

  public delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  } 
}