/** GENERATED BY BENDEC TYPE GENERATOR */
#[allow(unused_imports)]
use serde::{Deserialize, Deserializer, Serialize, Serializer};
big_array! { BigArray; 128, }
// primitive built-in: u8
// ignored: char
pub type Char3 = [char; 3];
pub type BigArray = [char; 128];

pub struct BigArrayNewtype(pub [char; 128]);

#[repr(C, packed)]
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Test {
  pub one: u8,
  pub two: u8,
}

pub type Test3 = [Test; 3];
pub type Ident = Test3;

/// This is the description of the struct Foo
#[repr(C, packed)]
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Foo {
  pub id_1: Ident,
  pub id_2: Test3,
  pub id_3: Char3,
  pub id_4: [u8; 3],
  #[serde(with = "BigArray")]
  pub id_5: BigArray,
  pub id_6: BigArrayNewtype,
}
