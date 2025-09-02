import { Injectable } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

export enum MsgType{
  Error = "Fehler",
  info ="Information"
}

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {

  constructor(
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    public toastController: ToastController
  ) { }

  private loading;

  public async updateLoading(message: string){
    this.loading = await this.loadingCtrl.create({
      message: message,
    });
    await this.loading.present();
  }

  public async hideLoading(){
   await this.loading.dismiss()
  }

  public async showMessage(type: string, message: string) {
    
    const alert = await this.alertCtrl.create({
      header: type,
      message: message,
      buttons: ['OK']
    });

    await alert.present();
  }

  public async showToast(message: string){
    const toast = await this.toastController.create({
      message: message,
      duration: 2500,
      position: 'top',
      mode: "md",
      cssClass: "custom-toast"
    });
    await toast.present();
  }
}
