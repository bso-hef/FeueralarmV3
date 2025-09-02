import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { NavController } from '@ionic/angular';
import { RestService } from '../_services/rest.service';

@Injectable({
  providedIn: 'root'
})
export class AuthLoginService implements CanActivate {

  constructor(
    private navCrtl: NavController,
    private rest: RestService
  ) { }


  async canActivate(): Promise<any>{
    if(this.rest.getAuth().token === ""){
      return true
    }
    this.navCrtl.navigateRoot("/")
    return false
  }
}
