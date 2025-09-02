import { Component, OnInit } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Auth, RestService } from './_services/rest.service';
import { FeedbackService } from './_services/feedback.service';
import { SocketService } from './_services/socket.service';

import { JwtHelperService } from '@auth0/angular-jwt';
import { NativeStorage } from '@ionic-native/native-storage/ngx';

const helper = new JwtHelperService()

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private rest: RestService,
    private feedback: FeedbackService,
    private io: SocketService,
    private nativeStorage: NativeStorage
  ) {
    this.initializeApp();
  }

  async ngOnInit(){
    if(this.platform.is("cordova")){
      let auth: Auth = await this.nativeStorage.getItem("login")
      if(auth){
        this.stayLoggedIn(auth)
      }
    }else{
      let token: string = localStorage.getItem("stayloggedin")
      if(token === 'true'){
        let credentials: Auth = {
          email: localStorage.getItem("user"),
          password: localStorage.getItem("password")
        }
        this.stayLoggedIn(credentials)
      }
    }
  }

  private async stayLoggedIn(credentials: Auth){
    this.rest.setAuth(credentials)
    let result: {ok : boolean, code: number, token?: string} = await this.rest.signin()
    if(result.ok){
      this.io.connect()
      this.rest.setAuthToken(result.token)
      this.rest.stayLoggedIn()
    }else{
      this.rest.logout()
    }
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }
}
