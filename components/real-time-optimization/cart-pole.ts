type CartPoleParameters = {
  poleLength: number;
  poleMass: number;
  cartMass: number;
  accelerationDueToGravity: number;
  poleImpulseFactor: number;
  cartImpulseFactor: number;
  poleDampeningFactor: number;
  cartDampeningFactor: number;
};
type CartPoleState = {
  poleAngularDisplacement: number;
  poleAngularVelocity: number;
  cartDisplacement: number;
  cartVelocity: number;
};
export type Impulse = {
  force: number;
  time: number;
};

export class CartPoleSystem {
  accelerationDueToGravity: number;
  poleLength: number;
  poleMass: number;
  poleAngularDisplacement = 0;
  poleAngularVelocity = 0;
  poleImpulseFactor: number;
  poleDampeningFactor: number;
  cartMass: number;
  cartDisplacement = 0;
  cartVelocity = 0;
  cartImpulseFactor: number;
  cartDampeningFactor: number;
  impulses: Array<Impulse> = [];

  constructor(parameters: CartPoleParameters) {
    this.poleLength = parameters.poleLength;
    this.poleMass = parameters.poleMass;
    this.cartMass = parameters.cartMass;
    this.accelerationDueToGravity = parameters.accelerationDueToGravity;
    this.poleImpulseFactor = parameters.poleImpulseFactor;
    this.poleDampeningFactor = parameters.poleDampeningFactor;
    this.cartImpulseFactor = parameters.cartImpulseFactor;
    this.cartDampeningFactor = parameters.cartDampeningFactor;
  }

  applyForces() {
    const totalMass = this.poleMass + this.cartMass;

    this.impulses.forEach((impulse) => {
      if (impulse.time > 0) {
        this.poleAngularVelocity +=
          (this.poleImpulseFactor * impulse.force) / totalMass;
        this.cartVelocity +=
          (this.cartImpulseFactor * impulse.force) / totalMass;
        impulse.time--;
      }
    });
    this.poleAngularVelocity +=
      (this.accelerationDueToGravity / this.poleLength) *
      Math.sin(this.poleAngularDisplacement);
    this.poleAngularVelocity *= this.poleDampeningFactor;
    this.cartVelocity *= this.cartDampeningFactor;
  }

  applyVelocities() {
    this.poleAngularDisplacement += this.poleAngularVelocity;
    this.cartDisplacement += this.cartVelocity;
  }

  *simulate(): Generator<CartPoleState, void, Impulse | void> {
    while (true) {
      const newImpulse = yield {
        poleAngularDisplacement: this.poleAngularDisplacement,
        poleAngularVelocity: this.poleAngularVelocity,
        cartDisplacement: this.cartDisplacement,
        cartVelocity: this.cartVelocity,
      };
      if (newImpulse) {
        this.impulses.push(newImpulse);
      }
      this.applyForces();
      this.impulses = this.impulses.filter((impulse) => impulse.time > 0);
      this.applyVelocities();
    }
  }
}

export class CartPoleVisuals {
  poleLength: number;
  poleAngularDisplacement = 0;
  poleAngularVelocity = 0;
  cartWidth: number;
  cartHeight: number;
  cartDisplacement = 0;
  cartVelocity = 0;
  groundLevel: number;
  wheelRadius: number;

  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null | undefined;

  constructor(parameters: {
    cartWidth: number;
    cartHeight: number;
    poleLength: number;
  }) {
    this.canvas = document.getElementById(
      "simulation-canvas"
    ) as HTMLCanvasElement;
    this.canvas.width = 850;
    this.canvas.height = 400;
    this.ctx = this.canvas?.getContext("2d");
    this.cartWidth = parameters.cartWidth;
    this.cartHeight = parameters.cartHeight;
    this.poleLength = parameters.poleLength;
    this.groundLevel = this.canvas.height - 2;
    this.wheelRadius = this.cartWidth * 0.1;
  }

  drawVisuals() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const cartX = this.cartDisplacement + this.canvas.width / 2;
      // Draw cart
      this.ctx.fillStyle = "red";
      this.ctx.fillRect(
        cartX - this.cartWidth / 2,
        this.groundLevel - this.cartHeight - this.wheelRadius,
        this.cartWidth,
        this.cartHeight
      );
      // Draw cart wheels
      this.ctx.fillStyle = "orange";
      this.ctx.strokeStyle = "white";
      this.ctx.lineWidth = 3;
      for (const wheelX of [
        cartX - 0.25 * this.cartWidth,
        cartX + 0.25 * this.cartWidth,
      ]) {
        this.ctx.beginPath();
        this.ctx.arc(
          wheelX,
          this.groundLevel - this.wheelRadius,
          this.wheelRadius,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.stroke();
      }

      // Draw pole
      this.ctx.strokeStyle = "white";
      this.ctx.lineWidth = 6;
      const poleEndY =
        this.groundLevel +
        this.cartHeight * 0.1 -
        this.cartHeight -
        this.wheelRadius;
      const poleTopX =
        cartX + this.poleLength * Math.sin(this.poleAngularDisplacement);
      const poleTopY =
        poleEndY - this.poleLength * Math.cos(this.poleAngularDisplacement);
      this.ctx.lineWidth = 6;
      this.ctx.beginPath();
      this.ctx.moveTo(cartX, poleEndY);
      this.ctx.lineTo(poleTopX, poleTopY);
      this.ctx.stroke();
    }
  }

  updateState(newState: CartPoleState) {
    Object.entries(newState).forEach(([key, value]) => {
      this[key as keyof CartPoleState] = value;
    });
  }
}
