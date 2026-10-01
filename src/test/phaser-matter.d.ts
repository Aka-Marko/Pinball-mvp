declare module 'phaser/src/physics/matter-js/CustomMain.js' {
  const Matter: {
    Bodies: typeof MatterJS.Bodies;
    Body: typeof MatterJS.Body;
    Composite: typeof MatterJS.Composite;
    Constraint: typeof MatterJS.Constraint;
    Events: typeof MatterJS.Events;
    Engine: typeof MatterJS.Engine;
  };
  export default Matter;
}
