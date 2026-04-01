import { Directive, ElementRef, HostListener, Input, NgModule, Type } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { HovercardWrapper } from './hovercard_wrapper';

@Directive({ selector: '[hovercardComponent]' })
export class HovercardDirective {
  @Input() hovercardComponent?: Type<unknown>;
  @Input() hovercardData: Record<string, any> = {};
  @Input() addBackground = false;
  @Input() hoverDelay = 200;

  private overlayRef?: OverlayRef;
  private hoverTimeout?: any;

  constructor(private overlay: Overlay, private elementRef: ElementRef) {}

  @HostListener('mouseenter')
  onMouseEnter() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = undefined;
    }
    this.hoverTimeout = setTimeout(() => this.show(), this.hoverDelay);
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.scheduleHide();
  }

  private show() {
    if (this.overlayRef || !this.hovercardComponent) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([
        { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8, }, // top
        { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8, }, // bottom
        { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8, }, // right
        { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8, }, // left
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: false,
    });

    const portal = new ComponentPortal(HovercardWrapper);
    const wrapperRef = this.overlayRef.attach(portal);
    wrapperRef.instance.hovercardComponent = this.hovercardComponent;
    wrapperRef.instance.hovercardData = this.hovercardData;
    wrapperRef.instance.addBackground = this.addBackground;

    const overlayElement = this.overlayRef.overlayElement;
    overlayElement.addEventListener('mouseenter', () => this.cancelHide());
    overlayElement.addEventListener('mouseleave', () => this.scheduleHide());
  }

  private hide() {
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
  }

  private scheduleHide() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = undefined;
    }
    this.hoverTimeout = setTimeout(() => this.hide(), this.hoverDelay);
  }

  private cancelHide() {
    if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
  }
}

@NgModule({
  declarations: [ HovercardDirective ],
  exports: [ HovercardDirective ]
})
export class HovercardModule {}