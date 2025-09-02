import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Teacher } from '../_interfaces/lehrer';
import { JwtHelperService } from '@auth0/angular-jwt';
import { FeedbackService } from './feedback.service';
import { async } from '@angular/core/testing';
import { NavController, Platform } from '@ionic/angular';

import * as moment from 'moment'
import { NativeStorage } from '@ionic-native/native-storage/ngx';

const helper = new JwtHelperService()

export interface Auth{
    email: string
    password: string
    token?: string
}

@Injectable({
  providedIn: 'root'
})
export class RestService {

  private role: BehaviorSubject<string> = new BehaviorSubject<string>("")
  private loggedInTimer
  constructor(
    private http: HttpClient,
    private feedback: FeedbackService,
    private navCtrl: NavController,
    private platform: Platform,
    private nativeStorage: NativeStorage
  ) { }

  private path: string = "https://alarm-bso.herokuapp.com/api/"

  private auth: Auth = {
    email: "",
    password: "",
    token: ""
  }


  public setAuth(auth: Auth){
    this.auth = auth
  }

  public setAuthToken(token: string){
    this.auth.token = token
  }

  public getAuth(): Auth{
    return this.auth
  }

  public getToken(): string{
    return this.auth.token
  }

  public getRole(): Observable<string>{
    return this.role.asObservable()
  }

  /**
   * Anmelden bei Restserver für Token
   */
  public async signin():Promise<{ok: boolean, code: number, token?: string}>{
    return new Promise<{ok: boolean, code: number, token?: string}>((resolve: any)=>{
      // console.log("auth",this.auth)
      this.http.post<{token: string}>(`${this.path}users/login`, this.auth, {observe: "response"}).subscribe(result=>{
        // console.log(moment(moment(new Date).diff(moment(new Date(helper.decodeToken(result.body.token).exp)))).format("mm"))
        
        this.role.next(helper.decodeToken(result.body.token).role)
        this.auth.token = result.body.token
        resolve({ok: true, code: 200, token: result.body.token})
      }, async (err: HttpErrorResponse)=>{
        console.error(err)
        resolve({ok: false, code: err.status})
      })
    })
  }

  public async stayLoggedIn(){
    let credentials: Auth = {
      email: "",
      password: ""
    }
    if(this.platform.is("cordova")){
      let auth: Auth = await this.nativeStorage.getItem("login")
      credentials = auth
    }else{
      credentials = {
        email: localStorage.getItem("user"),
        password: localStorage.getItem("password")
      }
    }
    // console.log("penis2", credentials)
      this.loggedInTimer = setInterval(()=>{
        this.http.post<any>(`${this.path}users/login`, credentials, {observe: "response"}).subscribe((result: HttpResponse<any>)=>{
          this.setAuthToken(result.body.token)
          console.log(result.body.token)
        }, (err: HttpErrorResponse)=>{
          console.error(err)
          this.logout()
        })
      }, 300000)
  }

  public logout(){
    this.auth = {
      email: "",
      password: "",
      token: ""
    }
    clearInterval(this.loggedInTimer)
    localStorage.clear()
    this.navCtrl.navigateRoot("/login")
  }

  /**
   * Gibt Werte zurück anhand von 2 Zeiten
   * @param {string} start zb.: 830(HMM) für 8:30 Uhr
   * @param {string} day zb: 20200908(yyyymmdd)
   */
  public getDataByTime(time: string, day: string): Observable<any>{
    
     let headers = new HttpHeaders({
        authorization: `Bearer ${this.auth.token}`
      })
    return this.http.post(`${this.path}posts/alert?time=${time}&day=${day}`,{}, {headers, observe: "response"})
  }

  // public loadFromUntis(): Observable<any>{
  //   let options = {
  //     headers: new HttpHeaders({
  //       authorization: `Bearer ${this.auth.token}`
  //     })
  //   }
  //   return this.http.post(`${this.path}posts/alert`,{}, options)
  // }

  public getAllData(): Observable<any>{
    
     let headers=  new HttpHeaders({
        authorization: `Bearer ${this.auth.token}`
      })
    return this.http.get(`${this.path}posts`, {headers, observe: "response"})
  }

  public updateTeacherState(teacher: Teacher, state: string): Observable<any>{

      let headers = new HttpHeaders({
        authorization: `Bearer ${this.auth.token}`
      })
    return this.http.put(`${this.path}posts/${teacher.id}`,{
      status: state
    }, {headers, observe: "response"})
  }

  public updateComment(teacher: Teacher, comment: string): Observable<any>{

      let headers = new HttpHeaders({
        authorization: `Bearer ${this.auth.token}`
      })
    return this.http.put(`${this.path}posts/${teacher.id}`,{
      comment: comment 
    }, {headers, observe: "response"})
  }
}