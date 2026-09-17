declare module 'ml-kmeans'{
    const kmeans: (
        data: number[][],
        k: number,
        options?: any
    ) => any;
    export default kmeans;
}