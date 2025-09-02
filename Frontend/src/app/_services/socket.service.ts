import { Injectable, OnInit } from '@angular/core';
import { locale } from 'moment';
import { Socket, SocketIoConfig } from 'ngx-socket-io';
import { BehaviorSubject, Observable } from 'rxjs';
import { Archive } from '../_interfaces/archive';
import { FeedbackService } from './feedback.service';
import { RestService } from './rest.service';
// import io from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService{

  private token: string
  private _posts: BehaviorSubject<any> = new BehaviorSubject<any>(null)
  private _update: BehaviorSubject<any> = new BehaviorSubject<any>(null)
  private _archive: BehaviorSubject<Archive[]> = new BehaviorSubject<Archive[]>(null)
  
  private debug: boolean = false
  private socketID: string
  private lastChangeSocketID: string
  private manualDisconnect: boolean = false
  private fetched: boolean = false

  constructor(
    private socket: Socket,
    private rest: RestService,
    private feedback: FeedbackService
  ) {
  }

  public get posts(): Observable<any>{
    return this._posts.asObservable()
  }

  public get update(): Observable<any>{
    return this._update.asObservable()
  }

  public get archive(): Observable<Archive[]>{
    return this._archive.asObservable()
  }

  public async disconnect(){
    this.socket.disconnect()
  }

  public async connect(){
    //Disable debug when in productive mode
    if (! this.debug) {
      console.log = function(x: string) {}  
    }
    const config: SocketIoConfig = {url : "https://alarm-bso.herokuapp.com", options: {forceNew: true}};
    this.socket = await new Socket(config)
    this.socket.on('connect', () => {
      console.log("Mit Socket verbunden")
    });
    this.socket.on('disconnect', async (event)=>{
      console.log("Verbindung zum Socket getrennt")
      location.reload()
      // if (! this.manualDisconnect) {
      //   await this.feedback.hideLoading()
      //   await this.feedback.showMessage("Fehler", "Verbindung zum Server verloren. Versuche erneute Verbindung in 5s.")
      // } else {
      //   this.manualDisconnect = false
      // }
    })
    this.socket.on("emitSocketId", (event) => {
      this.socketID = event.msg
      console.log("Socket ID")
      console.log(event.msg);
    });
    this.socket.on('error', function (err) { 
      console.log("Socket.IO Error"); 
      console.log(err.stack);
    });
    this.socket.emit("authenticate", {token: this.rest.getToken()})
    this.socket.on("authenticated", ()=>{
      this.token = this.rest.getToken()
      console.log(this.token)
      console.log("Socket erfolgreich angemeldet")
    })
    this.socket.on("unauthorized", async (error)=>{
      this.feedback.showMessage("Fehler", "Fehler beim Anmelden")
      console.log(error)
    })
    this.socket.on("emitError", async (event)=>{
      console.error("emitError",event)
      await this.feedback.hideLoading()
      await this.feedback.showMessage("Fehler", event.msg)
    })
    this.socket.on("emitPosts", async (event)=>{
      this.fetched = true
      console.log("emitPosts", event)
      await this.feedback.hideLoading()
      this._posts.next(event)
    })
    this.socket.on("emitAlerts",(event)=>{
      this._archive.next(event.posts)
      console.log("emitAlerts",event)
    })
    this.socket.on("emitUpdate", async (event)=>{
      this.lastChangeSocketID = event.msg
      this._update.next(event.posts[0])
      console.log("emitUpdate", event.posts[0])
    })
    // let i: number = 0;
    // await this.delay(2000)
    // while (! this.connected && i < 11) {
    //   console.log("Still connecting")
    //   this.socket = new Socket(config)
    //   this.socket.connect()
    //   i++;
    //   await this.delay(2000)
    // }
  }

  public getPosts(id: string = null){
    this.socket.emit("fetchPosts", {alertId: id})
  }

  public updatePost(id: string, status: string, comment: string){
    this.socket.emit("updatePost", {id: id, status: status, comment: comment})
  }

  public updateComment(id: string, comment: string){
    this.socket.emit("updatePost", {id: id, comment: comment})
  }

  public fetchAlerts(){
    this.socket.emit("fetchAlerts")
  }

  public alert(time: string, day: string){
    this.socket.emit("alert", {token: this.token, time: time, day: day})
  }

  public getFetched(): boolean {
    return this.fetched
  }

  public getSocketID(): string{
    return this.socketID
  }

  public getlastChangeSocketID(): string{
    return this.lastChangeSocketID
  }

  public delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  } 
}
