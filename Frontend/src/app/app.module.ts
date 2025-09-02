import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';

import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
const config: SocketIoConfig = { url: 'https://alarm-bso.herokuapp.com/api', options: {} };

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, IonicModule.forRoot(), 
            AppRoutingModule, HttpClientModule, SocketIoModule.forRoot(config)],
  providers: [
    StatusBar,
    SplashScreen,
    NativeStorage,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
