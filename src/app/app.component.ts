import { RouterOutlet } from '@angular/router';
import { Component, AfterViewInit } from '@angular/core';
import {Renderer} from '@pixi/core'
import {Container} from '@pixi/display'
import {Ticker} from '@pixi/ticker'


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
  ngAfterViewInit() {
    // Create a PIXI renderer
    const renderer = new Renderer({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0xADD8E6, // Light blue
      antialias: true
    });

    // Create a root container (the stage)
    const stage = new Container();

    // Append the canvas to the DOM
    document.getElementById('pixi-container')?.appendChild(renderer.view as HTMLCanvasElement);

    // Set up and start the render loop
    const ticker = new Ticker();
    ticker.add(() => {
      renderer.render(stage);
    });
    ticker.start();
  }
}
