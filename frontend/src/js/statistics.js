import { fetchAllStationPasses } from '../utils/api.js';

document.addEventListener('DOMContentLoaded', () => {
    const init = async () => {
        const chart = createBarChart();

        document.getElementById('view-stats').addEventListener('click', async () => {
            const startDate = document.getElementById('start-date').value.replace(/-/g, '');
            const endDate = document.getElementById('end-date').value.replace(/-/g, '');

            if (!startDate || !endDate) {
                alert('Please select both start and end dates.');
                return;
            }

            try {
                const stationPasses = await fetchAllStationPasses(startDate, endDate); // Fetch all station passes
                const groupedStatistics = groupByStationPrefix(stationPasses); // Group by prefix
                updateChart(chart, groupedStatistics); // Update the bar chart
            } catch (error) {
                console.error('Error fetching statistics:', error.message);
                alert('Failed to fetch statistics. Please try again.');
            }
        });
    };

    // Group statistics by the first two letters of toll station IDs
    const groupByStationPrefix = (data) => {
        const grouped = {};

        data.forEach(({ stationID, passageCount }) => {
            const prefix = stationID.match(/^[A-Za-z]+/)[0]; // Extract the non-numerical prefix
            grouped[prefix] = (grouped[prefix] || 0) + passageCount; // Accumulate passage counts
        });

        return Object.entries(grouped).map(([prefix, totalPasses]) => ({
            prefix,
            totalPasses,
        }));
    };

    // Update chart with grouped data
    const updateChart = (chart, groupedData) => {
        const labels = groupedData.map((group) => group.prefix);
        const data = groupedData.map((group) => group.totalPasses);

        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    };

    // Create an empty bar chart
    const createBarChart = () => {
        const ctx = document.getElementById('barChart').getContext('2d');
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Total Passes',
                        data: [],
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Passes by Toll Station Group' },
                },
                scales: {
                    y: { beginAtZero: true },
                },
            },
        });
    };

    init();
});
