import { StoreJson } from "../src/StoreJson.ts";
import { assertEquals } from "./test_deps.ts";

class Car {
  plate: string;
  brand: string;
  data: { a: number };
  constructor(plate: string, brand: string, data: { a: number }) {
    this.plate = plate;
    this.brand = brand;
    this.data = data;
  }
}

Deno.test("[Classes] may work as an normal object", () => {
  const rules = {
    _read: () => true,
    _write: () => () => true,
  };

  const db = new StoreJson({ rules, name: "tests//test.json" });
  const honda = new Car("1923BF", "Honda", { a: 33 });
  db.set("car", honda);
  assertEquals(db.get("car"), honda);
  db.write();
  db.load();
  assertEquals(db.get("car.brand"), "Honda");
  assertEquals(db.get("car.data.a"), 33);
});
