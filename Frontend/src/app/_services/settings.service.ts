import { Injectable } from '@angular/core';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { Platform } from '@ionic/angular';

@Injectable({
    providedIn: 'root'
  })
export class SettingsService {

    private chosenArchive: string
    private liveArchive: string

    constructor(
        private platform: Platform,
        private nativeStorage: NativeStorage
        ) {}

    public setSortby(sortby: string){
        if(this.platform.is("cordova")){
            this.nativeStorage.setItem("sortby", sortby)
        } else {
              localStorage.setItem("sortby", sortby)
        }
    }

    public getSortby(): string{
        var sortby
        if(this.platform.is("cordova")){
            sortby = this.nativeStorage.getItem("sortby")
        } else {
            sortby = localStorage.getItem("sortby")
        }
        console.log(sortby)
        return sortby
    }

    public setToast(toast: string){
        if(this.platform.is("cordova")){
            this.nativeStorage.setItem("toast", toast)
        } else {
            localStorage.setItem("toast", toast)
        }   
    }

    public getToast(): string{
        var toast
        if(this.platform.is("cordova")){
            toast = this.nativeStorage.getItem("toast")
        } else {
            toast = localStorage.getItem("toast")
        }
        return toast
    }

    public setChosenArchive(chosenArchive: string){
        this.chosenArchive = chosenArchive
    }

    public getChosenArchive(): string{
        return this.chosenArchive
    }

    public setLiveArchive(liveArchive: string){
        this.liveArchive = liveArchive
    }

    public getLiveArchive(): string{
        return this.liveArchive
    }

    public setStatus(status: string){
        if(this.platform.is("cordova")){
            this.nativeStorage.setItem("status", status)
        } else {
            localStorage.setItem("status", status)
        }   
    }

    public getStatus(): string{
        var status
        if(this.platform.is("cordova")){
            status = this.nativeStorage.getItem("status")
        } else {
            status = localStorage.getItem("status")
        }
        return status
    }
}
