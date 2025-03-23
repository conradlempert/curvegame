export default class Config {
  // Prod: server = 3000, client = 3000
  // Dev: server = 3000, client = 5173
  public static serverPort = 3000;
  public static clientDevPort = 5173;
  public static serverSize = 1;
  public static turningSpeed = 0.05;
  public static drivingSpeed = 2;
  public static playerHeadSize = 5;
  public static collisionDistance = 5; // should normally be the same as playerHeadSize
  public static collisionLineEndingRemoval = 20;
}
