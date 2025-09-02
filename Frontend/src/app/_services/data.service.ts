import { getLocaleDayNames } from '@angular/common';
import { Injectable } from '@angular/core';
import { ɵEmptyOutletComponent } from '@angular/router';

import * as faker from 'faker';
import { Teacher } from '../_interfaces/lehrer';
import { Informations, InformationService } from './information.service';
import { RestService } from './rest.service';
@Injectable({
  providedIn: 'root'
})
export class DataService {
  private role: string

  constructor(
    private rest: RestService,
    private information: InformationService
  ) { 
    this.rest.getRole().subscribe(result=>{
      this.role = result
    })
  }

  public getTeachersByJSON(data: any): Teacher[]{
    let teachers: Teacher[] = []
    if(data){
      this.information.setInformation({
        date: data[0].created,
        role: this.role
      })
    }
    data.forEach((element: any) => {
      let teacherNames: string[] = []
      let classes: string
      let rooms: string[] = []
      element.teachers.forEach(name => {
        teacherNames.push(name)
      });
      element.rooms.forEach(room => {
        rooms.push(room.number)
      });
      let teacher: Teacher = {
        id: element._id,
        names: teacherNames,
        class: element.class.name,
        classNumber: element.class.number,
        room: rooms,
        comment: element.comment.replace(" ", ""),
        state: this.getState(element.status)
      }
      
      teachers.push(teacher)
    });
    return teachers
  }


  private getState(stateString: string): number{
    switch (stateString){
      case 'undefined': {
        return 1
      }
      case "complete":{
        return 2
      }
      case "incomplete": {
        return 3
      }
    }
  }
}
