export function getGasman(location) {
    const mullumLocations = [
        "Crabbes Creek",
        "Huubrook",
        "Koonyum Range",
        "Mainarm",
        "Mullumbimby",
        "Mullum Creek",
        "Myocum",
        "Palmwoods",
        "Upper Main Arm",
        "Upper Wilsons Creek",
        "Wanganui",
        "Wilsons Creek"
    ];
    const byronLocations = [
        "Bangalow",
        "Billinudgel",
        "Brunswick Heads",
        "Byron Bay",
        "Coopers Shoot",
        "Broken Heads",
        "Ewingsdale",
        "Hayters Hill",
        "Mcleods Shoot",
        "Skinners Shoot",
        "South Golden Beach",
        "Telofa",
        "Tyagrah",
        "Yelgun",
        "Lennox Heads",
        "The Pocket",
        "Middle Pocket",
        "Ocean Shores"
    ];
    const federalLocations = [
        "Bexhill",
        "Binna Burra",
        "Clunes",
        "Coopers Creek",
        "Coorabell",
        "Corndale",
        "Dorroughby",
        "Eureka",
        "Federal",
        "Goonengary",
        "Possum Creek",
        "Repentance Creek",
        "Rosebank",
        "Whian Whian"
    ];

    if (mullumLocations.some(item => item === location)) {
        return "mullum";
    } else if (byronLocations.some(item => item === location)) {
        return "byron";
    } else if (federalLocations.some(item => item === location)) {
        return "federal";
    } else {
        return "mullum"; // or any default value
    }
}