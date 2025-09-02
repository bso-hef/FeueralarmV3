import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NavController, Platform } from '@ionic/angular';
import { FeedbackService } from '../_services/feedback.service';
import { Auth, RestService } from '../_services/rest.service';
import { SocketService } from '../_services/socket.service';
import { NativeStorage } from '@ionic-native/native-storage/ngx';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  public credentials: Auth = {
    email: "",
    password: ""
  }

  public signInorUp: boolean = true //true = anmdelen

  public error: string = ""

  public stayLogin: boolean = false

  constructor(
    private http: RestService,
    private feedback: FeedbackService,
    private navCtrl: NavController,
    private io: SocketService,
    private platform: Platform,
    private nativeStorage: NativeStorage
  ) { }

  ngOnInit(): void {}

  public async login(){
    this.credentials.email = this.credentials.email.toLocaleLowerCase().trim()
    this.http.setAuth(this.credentials)
    await this.feedback.updateLoading("Anmelden...")
    this.http.signin().then(async (result: {ok: boolean, code: number, token: string})=>{
      console.log(result)
        await this.feedback.hideLoading()
        if(result.ok){
          if(this.stayLogin){
            if(this.platform.is("cordova")){
              await this.nativeStorage.setItem("login", {
                user: this.credentials.email,
                password: this.credentials.password
              })
            }else{
              localStorage.setItem("stayloggedin", 'true')
              localStorage.setItem("user", this.credentials.email)
              localStorage.setItem("password", this.credentials.password)
            }
            this.http.stayLoggedIn()
          }
          this.io.connect()
          this.navCtrl.navigateRoot("/")
        }else{
          if(result.code === 404){
            await this.feedback.showMessage("Fehler", "Admeldename oder Passwort falsch.")
          }else{
            await this.feedback.showMessage("Fehler", "Beim Anmelden ist ein Fehler aufgetreten")
          }
        }
    })
  }
}
