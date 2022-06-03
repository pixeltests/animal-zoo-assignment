const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AnimalZoo", function () {
	let animalZoo;
	let trainer;
	let account1;

	const AnimalType = {
		None: 0,
		Fish: 1,
		Cat: 2,
		Dog: 3,
		Rabbit: 4,
		Parrot: 5,
	};

	const Gender = {
		Male: 0,
		Female: 1,
	};

	beforeEach("deploy contract", async () => {
		const accounts = await ethers.getSigners();

		trainer = accounts[0];
		account1 = accounts[1];

		const AnimalZoo = await ethers.getContractFactory("AnimalZoo");
		animalZoo = await AnimalZoo.deploy();
		await animalZoo.deployed();
	});

	describe("add", function () {
		it("should revert when not called by an trainer", async function () {
			await expect(
				animalZoo.connect(account1).add(AnimalType.Fish, 5)
			).to.be.revertedWith("Not an trainer");
		});

		it("should revert when invalid animal is provided", async function () {
			await expect(
				animalZoo.connect(trainer).add(AnimalType.None, 5)
			).to.be.revertedWith("Invalid animal");
		});

		it("should emit added event when animal is added", async function () {
			await expect(animalZoo.connect(trainer).add(AnimalType.Fish, 5))
				.to.emit(animalZoo, "Added")
				.withArgs(AnimalType.Fish, 5);
		});
	});

	describe("borrow", function () {
		it("should revert when age is 0", async function () {
			await expect(
				animalZoo.borrow(0, Gender.Male, AnimalType.Fish)
			).to.be.revertedWith("Invalid Age");
		});

		it("should revert when animal is not available in zoo", async function () {
			await expect(
				animalZoo.borrow(24, Gender.Male, AnimalType.Fish)
			).to.be.revertedWith("Selected animal not available");
		});

		it("should revert when animal type is invalid", async function () {
			await expect(
				animalZoo.borrow(24, Gender.Male, AnimalType.None)
			).to.be.revertedWith("Invalid animal type");
		});

		it("should revert when men attempt to borrow animals other than fish and dog", async function () {
			await animalZoo.add(AnimalType.Cat, 5);
			await animalZoo.add(AnimalType.Rabbit, 5);
			await animalZoo.add(AnimalType.Parrot, 5);

			await expect(
				animalZoo.borrow(24, Gender.Male, AnimalType.Cat)
			).to.be.revertedWith("Invalid animal for men");

			await expect(
				animalZoo.borrow(24, Gender.Male, AnimalType.Rabbit)
			).to.be.revertedWith("Invalid animal for men");

			await expect(
				animalZoo.borrow(24, Gender.Male, AnimalType.Parrot)
			).to.be.revertedWith("Invalid animal for men");
		});

		it("should revert when women under 40 attempt to borrow cat", async function () {
			await animalZoo.add(AnimalType.Cat, 5);

			await expect(
				animalZoo.borrow(24, Gender.Female, AnimalType.Cat)
			).to.be.revertedWith("Invalid animal for women under 40");
		});

		it("should revert when animal is already borrowed", async function () {
			await animalZoo.add(AnimalType.Fish, 5);
			await animalZoo.add(AnimalType.Cat, 5);

			await animalZoo
				.connect(account1)
				.borrow(24, Gender.Male, AnimalType.Fish);

			await expect(
				animalZoo
					.connect(account1)
					.borrow(24, Gender.Male, AnimalType.Fish)
			).to.be.revertedWith("Already adopted a animal");

			await expect(
				animalZoo
					.connect(account1)
					.borrow(24, Gender.Male, AnimalType.Cat)
			).to.be.revertedWith("Already adopted a animal");
		});

		it("should revert when address details do not match from previous calls", async function () {
			await animalZoo.add(AnimalType.Fish, 5);

			await animalZoo
				.connect(account1)
				.borrow(24, Gender.Male, AnimalType.Fish);

			await expect(
				animalZoo
					.connect(account1)
					.borrow(23, Gender.Male, AnimalType.Fish)
			).to.be.revertedWith("Invalid Age");

			await expect(
				animalZoo
					.connect(account1)
					.borrow(24, Gender.Female, AnimalType.Fish)
			).to.be.revertedWith("Invalid Gender");
		});

		it("should emit borrowed event when valid details are provided", async function () {
			await animalZoo.add(AnimalType.Fish, 5);

			await expect(
				animalZoo
					.connect(account1)
					.borrow(24, Gender.Male, AnimalType.Fish)
			)
				.to.emit(animalZoo, "Borrowed")
				.withArgs(AnimalType.Fish);
		});

		it("should decrease animal count when valid details are provided", async function () {
			await animalZoo.add(AnimalType.Fish, 5);

			let originalAnimalCount = await animalZoo.animalCounts(AnimalType.Fish);
			originalAnimalCount = originalAnimalCount.toNumber();
			await animalZoo
				.connect(account1)
				.borrow(24, Gender.Male, AnimalType.Fish);

			let reducedAnimalCount = await animalZoo.animalCounts(AnimalType.Fish);
			reducedAnimalCount = reducedAnimalCount.toNumber();

			expect(originalAnimalCount).to.equal(reducedAnimalCount + 1);
		});
	});

	describe("giveBackAnimal", function () {
		it("should revert when caller has never borrowed a animal", async function () {
			await expect(
				animalZoo.connect(account1).giveBackAnimal()
			).to.be.revertedWith("No borrowed animals");
		});

		it("should increment the animal count of that animal by 1", async function () {
			await animalZoo.add(AnimalType.Fish, 5);

			await animalZoo
				.connect(account1)
				.borrow(24, Gender.Male, AnimalType.Fish);
			let reducedAnimalCount = await animalZoo.animalCounts(AnimalType.Fish);
			reducedAnimalCount = reducedAnimalCount.toNumber();

			await animalZoo.connect(account1).giveBackAnimal();
			let currentAnimalCount = await animalZoo.animalCounts(AnimalType.Fish);
			currentAnimalCount = currentAnimalCount.toNumber();

			expect(reducedAnimalCount).to.equal(currentAnimalCount - 1);
		});
	});
});
