import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { NavController } from '@ionic/angular';
import { FeedbackService } from '../_services/feedback.service';
import { Auth, RestService } from '../_services/rest.service';
import { SocketService } from '../_services/socket.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {

  constructor(
    private navCrtl: NavController,
    private rest: RestService
  ) { }


  async canActivate(): Promise<any>{
    if(this.rest.getAuth().token !== ""){
      return true
    }
    this.navCrtl.navigateRoot("/login")
    return false
  }

}
