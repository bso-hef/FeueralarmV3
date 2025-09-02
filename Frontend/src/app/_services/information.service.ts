import { Injectable } from '@angular/core';

export interface Informations{
  date?: Date
  role?: string
}

@Injectable({
  providedIn: 'root'
})
export class InformationService {

  private info: Informations

  constructor() { }


  public setInformation(info: Informations){
    this.info = info
  }

  public getInformation(): Informations{
    return this.info
  }

}
