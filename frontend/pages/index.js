import { useState } from "react";
import {
  Box,
  Input,
  Button,
  VStack,
  Text,
  Image,
  SimpleGrid,
  Heading,
  Spinner,
  useToast,
} from "@chakra-ui/react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const search = async () => {
    if (!query.trim()) {
      toast({
        title: "Please enter a search query.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/search?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to fetch search results");
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack spacing={6} maxW="800px" mx="auto" mt="40px">
      <Heading size="xl" textAlign="center" mb={4} color="teal.300">
        Bingeworthy Search
      </Heading>
      <Box w="100%" display="flex" gap={2}>
        <Input
          placeholder="Search movies, shows..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          bg="gray.800"
          color="white"
          _placeholder={{ color: "gray.400" }}
        />
        <Button onClick={search} colorScheme="teal" isLoading={loading}>
          Search
        </Button>
      </Box>

      {loading && <Spinner size="xl" />}

      <SimpleGrid columns={[1, 2]} spacing={6} w="100%">
        {results.map((item) => (
          <Box
            key={item.id}
            bg="gray.700"
            borderRadius="md"
            overflow="hidden"
            boxShadow="lg"
            _hover={{ transform: "scale(1.05)", shadow: "xl" }}
            transition="all 0.3s ease-in-out"
            cursor="pointer"
          >
            <Image
              src={item.poster || "/placeholder.png"}
              alt={item.title}
              objectFit="cover"
              height="300px"
              width="100%"
              fallbackSrc="/placeholder.png"
            />
            <Box p={4}>
              <Text fontWeight="bold" fontSize="lg" mb={2}>
                {item.title} ({item.year})
              </Text>
              <Text noOfLines={3} fontSize="sm" color="gray.300">
                {item.summary || "No summary available."}
              </Text>
              <Text mt={2} fontSize="sm" color="teal.300">
                Rating: {item.aggregated_rating ?? "N/A"}/100
              </Text>
            </Box>
          </Box>
        ))}
      </SimpleGrid>
    </VStack>
  );
}