// import { findDeepestRule } from "../helpers.ts";
// import { assertEquals } from "./test_deps.ts";

// const context = { data: "bar", params: {}, newData: undefined, rootData: {} };

// Deno.test("[Rules params] findDeepestRule basic", () => {
//   const rules = {
//     people: {
//       $name: {
//         _read: () => true,
//       },
//     },
//   };
//   const found = findDeepestRule(
//     ["people", "garn", "age"],
//     "_read",
//     rules,
//   );

//   assertEquals(found.params.$name, "garn");
//   assertEquals(found._read?.(context), true);
// });

// Deno.test("[Rules params] findDeepestRule not found", () => {
//   const rules = {
//     people: {
//       $name: {
//         _read: () => true,
//       },
//     },
//   };

//   const notFound = findDeepestRule(
//     ["404", "garn", "age"],
//     "_read",
//     rules,
//   );
//   assertEquals(notFound.params, {});
//   assertEquals(notFound._read, undefined);
//   assertEquals(notFound, {
//     params: {},
//     _read: undefined,
//     rulePath: [],
//   });
// });

// Deno.test(
//   "[Rules params] findDeepestRule multiple rules",
//   () => {
//     const rules = {
//       _read: () => 0,
//       people: {
//         _read: () => 1,
//         $name: {
//           _read: () => 2,
//           age: {
//             _read: () => 3,
//           },
//         },
//       },
//     };
//     const found = findDeepestRule(
//       ["people", "garn", "age"],
//       "_read",
//       rules,
//     );
//     assertEquals(found._read?.(context), 3);
//     assertEquals(found.params, { $name: "garn" });
//   },
// );

// Deno.test("[Rules params] findDeepestRule root rule", () => {
//   const rules = {
//     _read: () => 0,
//     people: {
//       $name: {
//         age: {
//           ups: {
//             _read: () => 1,
//           },
//         },
//       },
//     },
//   };
//   const found = findDeepestRule(
//     ["people", "garn", "age"],
//     "_read",
//     rules,
//   );
//   assertEquals(found._read?.(context), 0);
//   assertEquals(found.params, { $name: "garn" });
// });

// Deno.test("[Rules params] findDeepestRule two ways", () => {
//   const rules = {
//     providers: {
//       $name: {
//         age: {
//           _read: () => 1,
//         },
//       },
//     },
//     $foo: {
//       $bar: {
//         age: { _read: () => 2 },
//       },
//     },
//   };
//   const first = findDeepestRule(
//     ["providers", "garn", "age"],
//     "_read",
//     rules,
//   );

//   assertEquals(first.params, { $name: "garn" });
//   assertEquals(first._read?.(context), 1);
//   const second = findDeepestRule(
//     ["clients", "garn", "age"],
//     "_read",
//     rules,
//   );
//   assertEquals(second.params, { $foo: "clients", $bar: "garn" });
//   assertEquals(second._read?.(context), 2);
// });
