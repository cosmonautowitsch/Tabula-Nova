{
  description = "A development environment for the project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/stable-24.11";
  };

  outputs = { self, nixpkgs };

  devShells.x86_64-linux.default = let
    pkgs = nixpkgs.legacyPackages.x86_64-linux;
  in pkgs.mkShell {
    packages = [
      pkgs.nodejs_20
      pkgs.zulu
    ];
  };
}